-- ============================================================
-- Controle Financeiro Pessoal — Etapa 3: schema inicial
-- Rode este script inteiro no Supabase: Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) categories
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "categories: select own"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "categories: insert own"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories: update own"
  on public.categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories: delete own"
  on public.categories for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2) monthly_finances
-- ------------------------------------------------------------
create table public.monthly_finances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  salary numeric(12, 2) not null default 0 check (salary >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, year)
);

alter table public.monthly_finances enable row level security;

create policy "monthly_finances: select own"
  on public.monthly_finances for select
  using (auth.uid() = user_id);

create policy "monthly_finances: insert own"
  on public.monthly_finances for insert
  with check (auth.uid() = user_id);

create policy "monthly_finances: update own"
  on public.monthly_finances for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "monthly_finances: delete own"
  on public.monthly_finances for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3) expenses
-- ------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monthly_finance_id uuid not null references public.monthly_finances (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('fixo', 'variavel')),
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_monthly_finance_id_idx on public.expenses (monthly_finance_id);
create index expenses_category_id_idx on public.expenses (category_id);

alter table public.expenses enable row level security;

create policy "expenses: select own"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy "expenses: insert own"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy "expenses: update own"
  on public.expenses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses: delete own"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) budgets ("caixinhas")
-- ------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  limit_amount numeric(12, 2) not null default 0 check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

alter table public.budgets enable row level security;

create policy "budgets: select own"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "budgets: insert own"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "budgets: update own"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budgets: delete own"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5) categorias padrão para todo novo usuário
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name) values
    (new.id, 'Faculdade'),
    (new.id, 'Internet'),
    (new.id, 'Alimentação'),
    (new.id, 'Transporte'),
    (new.id, 'Lazer'),
    (new.id, 'Saúde'),
    (new.id, 'Assinaturas'),
    (new.id, 'Moradia'),
    (new.id, 'Compras'),
    (new.id, 'Outros');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6) updated_at automático
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_monthly_finances
  before update on public.monthly_finances
  for each row execute function public.set_updated_at();

create trigger set_updated_at_expenses
  before update on public.expenses
  for each row execute function public.set_updated_at();

create trigger set_updated_at_budgets
  before update on public.budgets
  for each row execute function public.set_updated_at();
