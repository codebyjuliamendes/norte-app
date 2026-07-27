-- Norte — schema do banco (rode isso no SQL Editor do seu projeto Supabase)
-- Cria as tabelas de tarefas, prazos/provas, notas e hábitos, todas isoladas por usuário via RLS.

create extension if not exists "uuid-ossp";

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

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

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

alter table public.events enable row level security;

create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
create policy "events_update_own" on public.events for update using (auth.uid() = user_id);
create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);

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

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

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

alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits for update using (auth.uid() = user_id);
create policy "habits_delete_own" on public.habits for delete using (auth.uid() = user_id);

-- Check-ins diários de hábitos (um registro por hábito por dia)
create table if not exists public.habit_checkins (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  checkin_date date not null,
  unique (habit_id, checkin_date)
);

alter table public.habit_checkins enable row level security;

create policy "checkins_select_own" on public.habit_checkins for select using (auth.uid() = user_id);
create policy "checkins_insert_own" on public.habit_checkins for insert with check (auth.uid() = user_id);
create policy "checkins_delete_own" on public.habit_checkins for delete using (auth.uid() = user_id);
