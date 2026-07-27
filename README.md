# Norte — organizador de vida, estudo e trabalho

App web (PWA) para organizar tarefas, prazos/provas, notas rápidas e hábitos, com login e sincronização entre aparelhos via Supabase. Instalável no celular direto do navegador, sem loja de apps e sem custo.

## O que tem pronto

- **Tarefas** com categoria (vida / estudo / trabalho) e data
- **Calendário** de prazos, provas e compromissos
- **Notas rápidas**
- **Hábitos** com check-in dos últimos 7 dias
- Login por e-mail/senha (Supabase Auth), dados isolados por usuário (RLS)
- Instalável como app no celular (PWA) e funciona offline para o que já foi carregado

## 1. Criar o backend (Supabase — gratuito)

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto (plano free).
2. No painel do projeto, vá em **SQL Editor** → cole o conteúdo de `supabase-schema.sql` → **Run**. Isso cria as tabelas e as regras de segurança (cada pessoa só vê os próprios dados).
3. Vá em **Settings → API** e copie a **Project URL** e a **anon public key**.
4. Em **Authentication → Providers**, o login por e-mail/senha já vem ativado por padrão. Se quiser pular a confirmação por e-mail durante os testes, desative "Confirm email" em **Authentication → Settings**.

## 2. Rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env e cole sua URL e anon key do Supabase
npm run dev
```

Abra `http://localhost:5173`, crie sua conta e comece a usar.

## 3. Publicar de graça (pra acessar de qualquer lugar)

A forma mais simples é a **Vercel** (grátis para projetos pessoais):

1. Suba este projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os mesmos valores do seu `.env`).
4. Deploy. Você recebe uma URL pública (`algo.vercel.app`).

Netlify e GitHub Pages também funcionam do mesmo jeito, se preferir.

## 4. Instalar no celular (sem loja, sem custo)

- **Android (Chrome)**: abra a URL publicada → menu (⋮) → **Adicionar à tela inicial** / **Instalar app**.
- **iPhone (Safari)**: abra a URL → botão de compartilhar → **Adicionar à Tela de Início**.

O app passa a abrir em tela cheia, com ícone próprio, como um app nativo.

## Estrutura do projeto

```
src/
  lib/
    supabase.ts      # cliente Supabase + tipos
    useAuth.ts        # hook de sessão/login
    categories.ts     # cores e helpers de categoria
  components/
    Auth.tsx          # tela de login/criar conta
    WeekRibbon.tsx     # faixa da semana (navegação por data)
    Tasks.tsx          # tarefas
    CalendarView.tsx   # prazos/provas/compromissos
    Notes.tsx           # notas rápidas
    Habits.tsx           # hábitos com check-in
  App.tsx             # layout principal e abas
supabase-schema.sql   # schema do banco (rodar no Supabase)
```

## Próximos passos possíveis

- Notificações push de prazos próximos
- Modo escuro
- Exportar/importar dados
- Compartilhar tarefas com outra pessoa (ex: projeto em grupo)
