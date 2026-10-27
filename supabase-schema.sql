-- Norte — schema do banco (rode no SQL Editor do seu projeto Supabase).
--
-- O script é IDEMPOTENTE: pode ser executado em um banco novo ou em um banco que já tem
-- a versão anterior. Ele cria o que falta (tabelas goals, journal e rag_memories; colunas
-- priority/quadrant em tasks), recria as políticas de RLS de forma mais restrita e adiciona
-- limites de tamanho. As constraints novas usam NOT VALID para não falhar com linhas antigas.

create extension if not exists "uuid-ossp";

-- Helper: (re)cria as 4 políticas padrão "somente o dono" de uma tabela com coluna user_id.
-- O UPDATE usa USING + WITH CHECK: sem o WITH CHECK, um usuário conseguiria trocar o
-- user_id de uma linha própria para o id de outra pessoa.
create or replace function public.norte_apply_owner_policies(tbl text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_select_own', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_insert_own', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_update_own', tbl);
  execute format('drop policy if exists %I on public.%I', tbl || '_delete_own', tbl);
  execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', tbl || '_select_own', tbl);
  execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', tbl || '_insert_own', tbl);
  execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', tbl || '_update_own', tbl);
  execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', tbl || '_delete_own', tbl);
end;
$$;

-- Helper: adiciona uma constraint só se ela ainda não existir.
create or replace function public.norte_add_constraint(tbl text, name text, definition text)
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from pg_constraint where conname = name and conrelid = ('public.' || tbl)::regclass) then
    execute format('alter table public.%I add constraint %I %s not valid', tbl, name, definition);
  end if;
end;
$$;

-- =========================
-- TAREFAS
-- =========================
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null check (category in ('vida', 'estudo', 'trabalho')),
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks add column if not exists priority text not null default 'normal';
alter table public.tasks add column if not exists quadrant text not null default 'fazer';
select public.norte_add_constraint('tasks', 'tasks_priority_check', 'check (priority in (''normal'', ''alta'', ''urgente''))');
select public.norte_add_constraint('tasks', 'tasks_quadrant_check', 'check (quadrant in (''fazer'', ''agendar'', ''delegar'', ''eliminar''))');
select public.norte_add_constraint('tasks', 'tasks_title_length', 'check (char_length(title) between 1 and 200)');
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);
select public.norte_apply_owner_policies('tasks');

-- =========================
-- PRAZOS / CALENDÁRIO (provas, entregas, compromissos)
-- =========================
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null check (category in ('vida', 'estudo', 'trabalho')),
  event_date date not null,
  event_type text not null default 'prazo' check (event_type in ('prazo', 'prova', 'compromisso')),
  notes text,
  created_at timestamptz not null default now()
);

select public.norte_add_constraint('events', 'events_title_length', 'check (char_length(title) between 1 and 200)');
select public.norte_add_constraint('events', 'events_notes_length', 'check (notes is null or char_length(notes) <= 10000)');
create index if not exists events_user_date_idx on public.events (user_id, event_date);
select public.norte_apply_owner_policies('events');

-- =========================
-- NOTAS RÁPIDAS
-- =========================
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  content text not null default '',
  category text not null default 'vida' check (category in ('vida', 'estudo', 'trabalho')),
  updated_at timestamptz not null default now()
);

select public.norte_add_constraint('notes', 'notes_title_length', 'check (char_length(title) <= 200)');
select public.norte_add_constraint('notes', 'notes_content_length', 'check (char_length(content) <= 10000)');
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);
select public.norte_apply_owner_policies('notes');

-- =========================
-- HÁBITOS
-- =========================
create table if not exists public.habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null default 'vida' check (category in ('vida', 'estudo', 'trabalho')),
  created_at timestamptz not null default now()
);

select public.norte_add_constraint('habits', 'habits_name_length', 'check (char_length(name) between 1 and 200)');
select public.norte_apply_owner_policies('habits');

-- Check-ins diários de hábitos (um registro por hábito por dia)
create table if not exists public.habit_checkins (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  checkin_date date not null,
  unique (habit_id, checkin_date)
);

create index if not exists habit_checkins_user_idx on public.habit_checkins (user_id, checkin_date);
alter table public.habit_checkins enable row level security;
drop policy if exists "checkins_select_own" on public.habit_checkins;
drop policy if exists "checkins_insert_own" on public.habit_checkins;
drop policy if exists "checkins_delete_own" on public.habit_checkins;
create policy "checkins_select_own" on public.habit_checkins for select using (auth.uid() = user_id);
-- O hábito referenciado também precisa ser do próprio usuário.
create policy "checkins_insert_own" on public.habit_checkins for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
);
create policy "checkins_delete_own" on public.habit_checkins for delete using (auth.uid() = user_id);

-- =========================
-- METAS
-- =========================
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null default 'vida' check (category in ('vida', 'estudo', 'trabalho')),
  target_date date not null,
  target_value numeric not null default 100,
  current_value numeric not null default 0,
  progress integer not null default 0,
  unit text not null default '%',
  created_at timestamptz not null default now()
);

select public.norte_add_constraint('goals', 'goals_title_length', 'check (char_length(title) between 1 and 200)');
select public.norte_add_constraint('goals', 'goals_values_check', 'check (target_value > 0 and current_value >= 0 and progress between 0 and 100)');
select public.norte_add_constraint('goals', 'goals_unit_length', 'check (char_length(unit) <= 20)');
select public.norte_apply_owner_policies('goals');

-- =========================
-- DIÁRIO (humor e gratidão — um registro por dia)
-- =========================
create table if not exists public.journal (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null,
  mood text not null default 'bem' check (mood in ('otimo', 'bem', 'neutro', 'cansado', 'estressado')),
  gratitude_1 text not null default '',
  gratitude_2 text not null default '',
  gratitude_3 text not null default '',
  reflection text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists journal_user_date_key on public.journal (user_id, entry_date);
select public.norte_add_constraint(
  'journal',
  'journal_lengths',
  'check (char_length(gratitude_1) <= 300 and char_length(gratitude_2) <= 300 and char_length(gratitude_3) <= 300 and char_length(reflection) <= 5000)'
);
select public.norte_apply_owner_policies('journal');

-- =========================
-- MEMÓRIA DE BUSCA (usada pelo Assistente)
-- =========================
-- `embedding` guarda um vetor de 384 posições gerado no navegador (hash de palavras/trigramas).
-- Se o seu banco já tem esta tabela com uma coluna pgvector, ela continua funcionando.
create table if not exists public.rag_memories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source_type text not null check (source_type in ('task', 'event', 'note', 'habit', 'goal', 'journal')),
  source_id text not null,
  title text not null default '',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  embedding jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists rag_memories_user_source_idx on public.rag_memories (user_id, source_id);
select public.norte_apply_owner_policies('rag_memories');

-- Os helpers só são necessários durante a execução deste script.
drop function if exists public.norte_apply_owner_policies(text);
drop function if exists public.norte_add_constraint(text, text, text);
