# Norte

> Organizador de rotina, tarefas, agenda e hábitos pessoais.

[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://organiza-app-three.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)

**Norte** é uma aplicação web progressiva (PWA) desenvolvida para centralizar a gestão de tarefas, prazos acadêmicos, compromissos, hábitos diários, anotações e sessões de foco em uma única interface rápida e responsiva.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Ícones**: Lucide React
- **Backend & Autenticação**: Supabase (PostgreSQL + Row Level Security)
- **Áudio Sintetizado**: Web Audio API (geração nativa de ruído branco, sons de chuva, ondas e tons binaurais)
- **Modo Offline & PWA**: Vite PWA / Workbox (armazenamento híbrido via LocalStorage e sincronização em nuvem)
- **Hospedagem**: Vercel

---

## ⚡ Funcionalidades Principais

### 📋 Gestão de Tarefas & Matriz de Eisenhower
- Filtros por categoria (`Vida`, `Estudo`, `Trabalho`), status e prioridade.
- Visualização em Matriz de 4 Quadrantes (Urgente vs. Importante).
- Sistema de conclusão com feedback visual.

### ⏱️ Temporizador Pomodoro & Gerador de Sons Ambiente
- Ciclos de foco ajustáveis (25m foco, 5m descanso curto, 15m descanso longo).
- Síntese de áudio ambiente em tempo real via Web Audio API (sem necessidade de arquivos de áudio pesados).
- Recompensas em XP por sessões concluídas.

### 📅 Agenda & Calendário Semanal
- Ficha de compromissos com badges por tipo (`Prazo`, `Prova`, `Compromisso`).
- Indicadores visuais de contagem regressiva para entregas próximas.

### 💧 Desafios Sociais & Comparador de Agendas
- Tabela de classificação em tempo real entre amigos (metas de hidratação e minutos de foco).
- Comparador visual de horários livres entre amigos com agendamento direto na agenda.

### 🎯 Rastreador de Metas & Diário Reflexivo
- Acompanhamento de metas de longo prazo com barras de progresso numéricas.
- Registro diário de humor, 3 itens de gratidão e reflexão pessoal.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js 18+ instalado
- Gerenciador de pacotes `npm` ou `pnpm`

### Passos

1. **Clonar o repositório**:
   ```bash
   git clone https://github.com/codebyjuliamendes/norte-app.git
   cd norte-app/organiza-app
   ```

2. **Instalar dependências**:
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**:
   Crie um arquivo `.env` baseado no `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon
   ```
   > *Nota*: Caso as variáveis do Supabase não sejam informadas, o aplicativo opera em modo offline utilizando `LocalStorage`.

4. **Iniciar servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Abra `http://localhost:5173` no navegador.

---

## 🗄️ Estrutura do Banco de Dados (Supabase SQL)

O arquivo `supabase-schema.sql` na raiz do repositório contém a estrutura de tabelas e as políticas de segurança por linha (RLS):

- `public.tasks`: Tarefas com categoria, prazo, prioridade e quadrante.
- `public.events`: Compromissos, provas e prazos da agenda.
- `public.notes`: Anotações rápidas por categoria.
- `public.habits`: Hábitos diários cadastrados.
- `public.habit_checkins`: Registros diários de hábitos concluídos.
- `public.goals`: Metas de longo prazo com valores numéricos.
- `public.journal`: Registros de humor e gratidão diários.

---

## 📁 Estrutura de Arquivos

```
organiza-app/
├── public/                # Ícones, favicon e manifesto PWA
├── src/
│   ├── components/        # Componentes reutilizáveis do sistema
│   │   ├── Auth.tsx       # Autenticação (Email, SMS e Demo)
│   │   ├── Tasks.tsx      # Lista de tarefas & Matriz de Eisenhower
│   │   ├── FocusTimer.tsx # Temporizador Pomodoro & áudio sintetizado
│   │   ├── CalendarView.tsx# Agenda e eventos
│   │   ├── Habits.tsx     # Rastreador de hábitos
│   │   ├── SocialChallenges.tsx # Desafios com amigos & busca de horários livres
│   │   ├── NorteLogo.tsx  # Logotipo vetorial em SVG
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts    # Cliente Supabase & fallback LocalStorage
│   │   ├── categories.ts  # Mapeamento de temas e datas
│   │   └── useAuth.ts     # Hook de controle de sessão
│   ├── App.tsx            # Navegação principal e barramento de estado
│   ├── index.css          # Sistema de design Tailwind & tema carvão
│   └── main.tsx           # Ponto de entrada do React
├── supabase-schema.sql    # Schema PostgreSQL para o Supabase
└── vite.config.ts         # Configuração do Vite e PWA
```

---

## 📄 Licença

Este projeto é de uso pessoal e educacional. Sinta-se à vontade para utilizar e adaptar.
