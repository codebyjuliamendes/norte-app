import { supabase } from './supabase'

export interface RagMemory {
  id?: string
  user_id: string
  source_type: 'task' | 'event' | 'note' | 'habit' | 'goal' | 'journal'
  source_id: string
  title: string
  content: string
  metadata?: Record<string, any>
  embedding?: number[]
  updated_at?: string
}

/**
 * Lightweight 384-dimensional deterministic feature hashing vectorizer.
 * Generates semantic dense vectors for text in browser without API key latency.
 */
export function generateTextEmbedding(text: string, dimensions: number = 384): number[] {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const words = normalized.split(/\W+/).filter(Boolean)
  
  const vector = new Array(dimensions).fill(0)
  if (words.length === 0) return vector

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    let hash = 5381
    for (let j = 0; j < word.length; j++) {
      hash = (hash * 33) ^ word.charCodeAt(j)
    }
    const index = Math.abs(hash) % dimensions
    vector[index] += 1 / Math.sqrt(words.length)

    // Trigram features
    for (let k = 0; k < word.length - 2; k++) {
      const tri = word.slice(k, k + 3)
      let triHash = 0
      for (let m = 0; m < tri.length; m++) {
        triHash = (triHash * 31) ^ tri.charCodeAt(m)
      }
      const triIndex = Math.abs(triHash) % dimensions
      vector[triIndex] += 0.5 / Math.sqrt(words.length)
    }
  }

  // Normalize vector to unit length (L2 norm)
  let norm = 0
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i]
  }
  norm = Math.sqrt(norm)

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm
    }
  }

  return vector
}

/**
 * Syncs any item (Task, Event, Note, Goal, Journal) into Supabase RAG Memory
 */
export async function syncItemToRagMemory(
  userId: string,
  sourceType: RagMemory['source_type'],
  sourceId: string,
  title: string,
  content: string,
  metadata: Record<string, any> = {}
) {
  if (!userId) return

  const fullText = `${title} ${content} ${JSON.stringify(metadata)}`
  const embedding = generateTextEmbedding(fullText)

  try {
    // Delete existing memory for this source_id if any
    await supabase
      .from('rag_memories')
      .delete()
      .eq('user_id', userId)
      .eq('source_id', sourceId)

    // Insert updated memory with embedding into Supabase
    await supabase.from('rag_memories').insert({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      title,
      content,
      metadata,
      embedding,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('RAG Memory sync error:', err)
  }
}

/**
 * Searches RAG memories stored in Supabase for relevant context
 */
export async function queryRagContext(
  userId: string,
  queryText: string,
  topK: number = 5
): Promise<{ title: string; content: string; sourceType: string; score: number }[]> {
  if (!userId || !queryText.trim()) return []

  const queryEmbedding = generateTextEmbedding(queryText)

  try {
    const { data, error } = await supabase
      .from('rag_memories')
      .select('*')
      .eq('user_id', userId)

    if (error || !data || data.length === 0) return []

    // Calculate Cosine Similarity with stored embeddings
    const scored = data.map((item: any) => {
      let sim = 0
      if (item.embedding && Array.isArray(item.embedding)) {
        for (let i = 0; i < queryEmbedding.length; i++) {
          sim += queryEmbedding[i] * (item.embedding[i] || 0)
        }
      } else {
        // Fallback keyword score
        const lowerQ = queryText.toLowerCase()
        const lowerT = (item.title + ' ' + item.content).toLowerCase()
        sim = lowerT.includes(lowerQ) ? 0.8 : 0.1
      }
      return {
        title: item.title,
        content: item.content,
        sourceType: item.source_type,
        score: sim,
      }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  } catch (err) {
    console.error('RAG context query error:', err)
    return []
  }
}
