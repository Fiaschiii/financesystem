-- ============================================================
-- Controle Financeiro Pessoal — Etapa 12: segurança e RLS
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole tudo > Run
--
-- Roda dentro de uma transação: se qualquer passo falhar, nada é aplicado
-- e o banco continua exatamente como estava.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Chaves estrangeiras "do mesmo dono"
--
-- Chaves estrangeiras ignoram o RLS: com a FK simples, alguém usando a API
-- do Supabase direto conseguia criar um gasto SEU apontando para a categoria
-- ou o mês de OUTRA pessoa (sabendo o UUID). Com a chave composta
-- (id, user_id), a linha referenciada precisa ter o mesmo user_id — o banco
-- recusa sozinho, sem depender do backend.
-- ------------------------------------------------------------

-- A FK composta precisa de uma unicidade exatamente nessas colunas.
alter table public.categories
  add constraint categories_id_user_id_key unique (id, user_id);

alter table public.monthly_finances
  add constraint monthly_finances_id_user_id_key unique (id, user_id);

alter table public.expenses
  drop constraint expenses_monthly_finance_id_fkey,
  drop constraint expenses_category_id_fkey;

alter table public.budgets
  drop constraint budgets_category_id_fkey;

alter table public.expenses
  add constraint expenses_monthly_finance_same_owner_fkey
    foreign key (monthly_finance_id, user_id)
    references public.monthly_finances (id, user_id)
    on delete cascade,
  -- Continua impedindo excluir uma categoria que tem gastos.
  add constraint expenses_category_same_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete restrict;

alter table public.budgets
  add constraint budgets_category_same_owner_fkey
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade;

-- ------------------------------------------------------------
-- 2) Políticas de RLS refeitas
--
-- - "to authenticated": quem não está logado (papel anon) não tem nenhuma
--   política e, portanto, não enxerga nem grava nada — nem tenta.
-- - "(select auth.uid())": o Postgres calcula o id uma vez por consulta, em
--   vez de uma vez por linha. Mesmo resultado, mais rápido. É o formato que o
--   Security/Performance Advisor do Supabase recomenda.
-- As regras continuam as mesmas: cada um só vê e mexe no que é seu.
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'monthly_finances', 'expenses', 'budgets'] loop
    execute format('drop policy %I on public.%I', t || ': select own', t);
    execute format('drop policy %I on public.%I', t || ': insert own', t);
    execute format('drop policy %I on public.%I', t || ': update own', t);
    execute format('drop policy %I on public.%I', t || ': delete own', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)',
      t || ': select own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)',
      t || ': insert own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t || ': update own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)',
      t || ': delete own', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 3) Limites de texto também no banco
--
-- O backend já valida esses tamanhos, mas quem fala direto com a API do
-- Supabase pula o backend. Os limites são os mesmos de
-- backend/src/utils/validators.js (via controllers).
-- ------------------------------------------------------------

alter table public.categories
  add constraint categories_name_check
    check (btrim(name) <> '' and char_length(name) <= 60),
  add constraint categories_description_check
    check (description is null or char_length(description) <= 200);

alter table public.expenses
  add constraint expenses_description_check
    check (btrim(description) <> '' and char_length(description) <= 120),
  add constraint expenses_notes_check
    check (notes is null or char_length(notes) <= 500);

-- ------------------------------------------------------------
-- 4) Funções
--
-- - search_path fixo (vazio): sem isso, uma função pode acabar usando um
--   objeto de mesmo nome criado em outro schema. Os nomes dentro delas já
--   vêm com o schema (public.categories), então nada muda no comportamento.
-- - handle_new_user é "security definer" (roda com os poderes de quem a
--   criou): ninguém além do gatilho precisa chamá-la, então tiramos a
--   permissão de execução dos papéis da API. O gatilho continua funcionando
--   (o Postgres só confere essa permissão ao criar o gatilho).
-- ------------------------------------------------------------

alter function public.handle_new_user() set search_path = '';
alter function public.set_updated_at() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
