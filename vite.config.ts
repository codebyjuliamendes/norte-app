import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

interface VercelHeaders {
  headers?: { source: string; headers: { key: string; value: string }[] }[]
}

/** Reuse the production security headers from vercel.json for `vite preview` (single source of truth). */
function productionHeaders(): Record<string, string> {
  try {
    const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as VercelHeaders
    const global = config.headers?.find((h) => h.source === '/(.*)')
    return Object.fromEntries(
      (global?.headers ?? []).filter((h) => h.key !== 'Strict-Transport-Security').map((h) => [h.key, h.value]),
    )
  } catch {
    return {}
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (mode === 'production' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
    console.warn(
      '\n[norte] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não definidas: o build roda em MODO LOCAL (sem login nem sincronização em nuvem).\n' +
        '        Na Vercel, configure-as em Project Settings → Environment Variables.\n',
    )
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Norte — organizador pessoal',
          short_name: 'Norte',
          description: 'Vida, estudo e trabalho em um só lugar.',
          lang: 'pt-BR',
          theme_color: '#0D1117',
          background_color: '#0D1117',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          // Never serve Supabase API calls from the service worker cache.
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
    server: { port: 5173 },
    preview: { headers: productionHeaders() },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
