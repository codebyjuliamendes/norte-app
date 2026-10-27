# Norte

> Organizador de rotina, tarefas, agenda e hábitos pessoais.

[![CI](https://github.com/codebyjuliamendes/norte-app/actions/workflows/ci.yml/badge.svg)](https://github.com/codebyjuliamendes/norte-app/actions/workflows/ci.yml)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://organiza-app-three.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

**Norte** é uma aplicação web progressiva (PWA) que reúne tarefas, prazos acadêmicos, compromissos, hábitos, anotações,
metas, diário e sessões de foco em uma única interface, separadas em três áreas da vida: **Vida**, **Estudo** e **Trabalho**.

Demo: <https://organiza-app-three.vercel.app>

---

## Problema

Quem estuda e trabalha ao mesmo tempo costuma espalhar a rotina em vários apps (lista de tarefas, agenda, app de hábitos,
bloco de notas, timer). O Norte junta tudo em um painel único, com um resumo do dia e da semana logo na abertura.

## Funcionalidades

| Área                      | O que faz                                                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tarefas**               | Categoria, prazo, prioridade e quadrante; filtros por categoria/status; busca sem acentos; visão em **Matriz de Eisenhower**.                                                                                                              |
| **Kanban**                | Três colunas (A fazer, Em andamento, Concluído) sobre as mesmas tarefas.                                                                                                                                                                   |
| **Foco**                  | Pomodoro 25/5/15 (pausa longa a cada 4 sessões) baseado em relógio real, sons ambiente sintetizados com Web Audio API (chuva, ondas, ruído de café e tons binaurais 200/210 Hz), XP por sessão. O timer continua rodando ao trocar de aba. |
| **Agenda**                | Prazos, provas e compromissos com observações, destaque para “hoje” e eventos anteriores.                                                                                                                                                  |
| **Hábitos**               | Check-in diário nos últimos 7 dias e contagem semanal.                                                                                                                                                                                     |
| **Notas**                 | Notas rápidas por categoria, busca, leitura em janela e cópia do texto.                                                                                                                                                                    |
| **Metas**                 | Metas numéricas com unidade, data alvo e barra de progresso.                                                                                                                                                                               |
| **Diário**                | Humor, 3 gratidões e reflexão — um registro por dia, editável.                                                                                                                                                                             |
| **Métricas / Nível & XP** | Score simples de produtividade (fórmula exibida na tela), níveis e conquistas.                                                                                                                                                             |
| **Relatório**             | Resumo em texto para copiar ou baixar em `.txt`.                                                                                                                                                                                           |
| **Assistente**            | Sugestões **por regras** (rotina equilibrada, decompor tarefa em 3 passos) e busca por similaridade de texto nas tarefas/notas salvas. Não usa nenhum serviço de IA externo.                                                               |
| **Social**                | **Prévia/demonstração**: amigos, placares e agendas são dados de exemplo e não são salvos. Só “Propor encontro” cria um compromisso real (na próxima data do dia da semana escolhido).                                                     |

Outros: atalhos de teclado (`1`–`9` para abas, `N` nova tarefa, `F` foco, `?` ajuda, `Esc` fecha janelas), PWA instalável,
interface responsiva (testada em 390 px) e acessível (labels, foco visível, navegação por teclado, `prefers-reduced-motion`).

## Como rodar localmente

Pré-requisitos: **Node.js 20.19+** (recomendado 22) e npm.

```bash
git clone https://github.com/codebyjuliamendes/norte-app.git
cd norte-app
npm install
cp .env.example .env.local   # opcional: preencha para usar o Supabase
npm run dev                  # http://localhost:5173
```

Sem as variáveis do Supabase o app abre em **modo local**: um botão “Começar no modo local” cria uma sessão no próprio
navegador e todos os dados ficam no `localStorage`. É o jeito mais rápido de testar.

### Variáveis de ambiente

| Variável                 | Obrigatória | Descrição                                                                                             |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | para nuvem  | URL do projeto (`https://<ref>.supabase.co`). Precisa ser `https://` (ou `http://localhost`).         |
| `VITE_SUPABASE_ANON_KEY` | para nuvem  | Chave **anon/pública** do projeto. Ela vai para o navegador por design; a proteção dos dados é o RLS. |

As variáveis são validadas na inicialização (`src/lib/config.ts`). Se faltarem ou forem inválidas, o app entra em modo local
e registra um aviso no console; o build também avisa.

### Banco de dados (Supabase)

Rode `supabase-schema.sql` no **SQL Editor** do projeto. O script é idempotente (pode ser executado em um banco novo ou em
cima da versão anterior) e:

- cria `tasks`, `events`, `notes`, `habits`, `habit_checkins`, `goals`, `journal` e `rag_memories`;
- adiciona `priority`/`quadrant` em `tasks` quando ainda não existem;
- aplica RLS “somente o dono” em todas as tabelas, com `WITH CHECK` no `UPDATE` e verificação de dono do hábito no check-in;
- adiciona limites de tamanho (`NOT VALID`, para não quebrar linhas antigas), índices e um diário único por dia.

Para login por SMS é preciso habilitar um provedor de SMS no Supabase; caso contrário use e-mail e senha.

## Scripts

| Comando                           | O que faz                                                              |
| --------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento (Vite).                                    |
| `npm run build`                   | Typecheck + build de produção em `dist/`.                              |
| `npm run preview`                 | Serve o build com os **mesmos headers de segurança** do `vercel.json`. |
| `npm test`                        | Testes (Vitest + Testing Library, jsdom).                              |
| `npm run lint`                    | oxlint (warnings falham).                                              |
| `npm run format` / `format:check` | Prettier.                                                              |
| `npm run typecheck`               | `tsc -b`.                                                              |
| `npm run check`                   | lint + format + typecheck + testes (o mesmo que a CI).                 |

## Arquitetura

```
src/
├── App.tsx                 # Shell: sessão, carregamento dos dados, abas (code-split com React.lazy), atalhos
├── components/             # Telas e componentes de UI (Tasks, CalendarView, Habits, FocusTimer, ...)
│   └── ui.tsx              # Modal acessível, mensagens de erro, utilitários visuais
├── lib/
│   ├── config.ts           # Leitura e validação das variáveis de ambiente
│   ├── dates.ts            # Datas sempre no calendário LOCAL (YYYY-MM-DD)
│   ├── domain/             # Regras puras e testadas: tarefas/kanban, XP e metas, pomodoro, validação, relatório
│   ├── db/
│   │   ├── dataClient.ts   # Cliente de dados com API estilo Supabase + cache local por usuário
│   │   ├── localStore.ts   # Tabelas no localStorage, escopadas por usuário
│   │   ├── localAuth.ts    # Sessão local usada quando o Supabase não está configurado
│   │   └── syncStatus.ts   # Estado de sincronização observado pela UI
│   ├── supabase.ts         # Monta o cliente real (ou modo local) e exporta a fachada `supabase`
│   ├── ragEngine.ts        # Vetorização por hash de palavras/trigramas e busca por similaridade
│   └── useAuth.ts          # Hooks de sessão e de status de sincronização
└── index.css               # Tema escuro (Tailwind v4), foco visível, reduced motion
```

**Decisões principais**

- **Offline-tolerante, sem esconder o problema.** Toda operação vai primeiro ao Supabase. Se falhar (sem rede, tabela ou
  coluna ausente, RLS), ela é aplicada no cache local e a tela mostra um aviso de “sem sincronização”. Itens criados assim
  ganham id `loc-…` e são reenviados automaticamente no próximo carregamento bem-sucedido. O cache é separado por usuário,
  então duas contas no mesmo navegador não veem os dados uma da outra.
- **Datas locais.** Datas são `YYYY-MM-DD` montadas a partir do fuso do usuário (antes, `toISOString()` fazia “hoje” virar
  “amanhã” depois das 21h no Brasil).
- **Regras fora dos componentes.** Cálculos de XP, metas, Kanban, filtros, pomodoro e validações ficam em `src/lib/domain`,
  cobertos por testes unitários.
- **Tema escuro único.** O app foi desenhado em modo escuro; a variante `dark:` do Tailwind segue a classe `dark` do `<html>`
  (e não a preferência do sistema), evitando telas mistas.

## Segurança

- Sem credenciais no código: URL e chave do Supabase vêm do ambiente.
- RLS em todas as tabelas (ver `supabase-schema.sql`); o cliente ainda filtra por `user_id` em toda leitura.
- Headers em produção via `vercel.json`: CSP restrita (scripts só do próprio domínio; conexões apenas para `*.supabase.co`),
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS e COOP.
- Validação e limites de tamanho nos formulários (espelhados como constraints no banco); URL de avatar aceita apenas `https://`.
- React escapa todo conteúdo do usuário; não há `dangerouslySetInnerHTML`.

## Testes

```bash
npm test
```

- **Unitários**: datas/fuso, configuração, regras de domínio, cliente de dados (modo local, fallback, isolamento por usuário,
  migração do cache antigo, reenvio de itens offline) e sessão local.
- **Integração** (`src/App.test.tsx`): fluxos reais da interface em modo local — criar/concluir/excluir tarefa, validação,
  persistência após recarregar, atalhos de teclado, hábitos, diário e metas.

A CI (GitHub Actions) roda lint, formatação, typecheck, testes, build e um smoke test do build servido com os headers.

## Deploy (Vercel)

O projeto é detectado como Vite; não há configuração de build especial. Em **Project Settings → Environment Variables**,
defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Production e Preview). Sem elas, o deploy funciona, mas em modo local.
O `vercel.json` contém apenas os headers de segurança.

> Se o seu projeto Supabase usar um domínio próprio (diferente de `*.supabase.co`), inclua-o em `connect-src` na CSP do
> `vercel.json`.

## Limitações conhecidas

- Edições/exclusões de itens já sincronizados feitas **sem conexão** ficam só neste dispositivo e podem ser sobrescritas no
  próximo carregamento do servidor (apenas itens **criados** offline são reenviados).
- A aba **Social** é uma demonstração com dados fictícios; ainda não existe conexão real entre contas.
- O “Assistente” usa regras fixas e busca por similaridade de texto — não há modelo de linguagem.
- O XP das sessões de foco é guardado por navegador (não vai para o banco).
- Apenas tema escuro.

## Licença

Projeto de uso pessoal e educacional. Sinta-se à vontade para utilizar e adaptar.
