-- ============================================================
-- Verificação de segurança (só LÊ, não altera nada)
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run
-- Pode rodar quantas vezes quiser. Tudo deve aparecer com ✅.
-- ============================================================

with tabelas as (
  select unnest(array['categories', 'monthly_finances', 'expenses', 'budgets']) as tabela
),
rls as (
  select t.tabela, coalesce(c.relrowsecurity, false) as ativo
  from tabelas t
  left join pg_class c on c.relname = t.tabela and c.relnamespace = 'public'::regnamespace
),
politicas as (
  select tablename as tabela,
         count(*) filter (where permissive = 'PERMISSIVE') as total,
         count(*) filter (where permissive = 'RESTRICTIVE' and policyname = tablename || ': mfa') as mfa,
         bool_and(roles = '{authenticated}') as so_logados
  from pg_policies
  where schemaname = 'public'
  group by tablename
),
fks as (
  select conname
  from pg_constraint
  where connamespace = 'public'::regnamespace and contype = 'f'
),
checks as (
  select conname
  from pg_constraint
  where connamespace = 'public'::regnamespace and contype = 'c'
)
select item, case when ok then '✅' else '❌' end as status
from (
  select 'RLS ativo em ' || tabela as item, ativo as ok, 1 as ordem from rls
  union all
  select '4 políticas, só para usuários logados, em ' || t.tabela,
         coalesce(p.total = 4 and p.so_logados, false), 2
  from tabelas t left join politicas p using (tabela)
  union all
  select 'Verificação em duas etapas exigida pelo banco em ' || t.tabela,
         coalesce(p.mfa = 1, false), 6
  from tabelas t left join politicas p using (tabela)
  union all
  select 'Função do MFA fora da API e sem acesso de visitantes',
         coalesce((select p.prosecdef
                          and p.proconfig @> array['search_path=""']
                          and not has_function_privilege('anon', p.oid, 'execute')
                   from pg_proc p
                   where p.oid = to_regprocedure('private.mfa_satisfied()')), false), 6
  union all
  select 'Gasto só aponta para mês do mesmo dono',
         exists (select 1 from fks where conname = 'expenses_monthly_finance_same_owner_fkey'), 3
  union all
  select 'Gasto só aponta para categoria do mesmo dono',
         exists (select 1 from fks where conname = 'expenses_category_same_owner_fkey'), 3
  union all
  select 'Caixinha só aponta para categoria do mesmo dono',
         exists (select 1 from fks where conname = 'budgets_category_same_owner_fkey'), 3
  union all
  select 'Limites de texto no banco (categorias e gastos)',
         (select count(*) = 4 from checks where conname in (
           'categories_name_check', 'categories_description_check',
           'expenses_description_check', 'expenses_notes_check')), 4
  union all
  select 'Funções com search_path fixo',
         (select bool_and(proconfig @> array['search_path=""'])
          from pg_proc
          where pronamespace = 'public'::regnamespace
            and proname in ('handle_new_user', 'set_updated_at')), 5
  union all
  select 'handle_new_user não pode ser chamada pela API',
         not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
         and not has_function_privilege('anon', 'public.handle_new_user()', 'execute'), 5
  -- ---------------- Etapa 18 (0005): perfil e sessões ----------------
  union all
  select 'RLS ativo em profiles',
         coalesce((select relrowsecurity from pg_class
                   where oid = to_regclass('public.profiles')), false), 7
  union all
  select 'Perfil: ler, criar e alterar só o próprio (sem excluir), só para logados',
         coalesce((select count(*) filter (where permissive = 'PERMISSIVE') = 3
                          and bool_and(roles = '{authenticated}')
                          and bool_and(qual is null or qual like '%auth.uid()%= id%'
                                       or permissive = 'RESTRICTIVE')
                   from pg_policies
                   where schemaname = 'public' and tablename = 'profiles'), false), 7
  union all
  select 'Verificação em duas etapas exigida pelo banco em profiles',
         exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'profiles'
                   and policyname = 'profiles: mfa' and permissive = 'RESTRICTIVE'), 7
  union all
  select 'Perfil: limites de nome, telefone, idioma, tema e foto na pasta do dono',
         (select count(*) = 5 from checks where conname in (
           'profiles_full_name_check', 'profiles_phone_check', 'profiles_avatar_path_check',
           'profiles_language_check', 'profiles_theme_check')), 7
  union all
  select 'Perfil: painéis do Resumo validados pelo banco (6 painéis, cada um uma vez)',
         exists (select 1 from checks where conname = 'profiles_dashboard_panels_check'), 7
  union all
  select 'Sessão encerrada recusada pelo banco em ' || t.tabela,
         exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = t.tabela
                   and policyname = t.tabela || ': sessão ativa' and permissive = 'RESTRICTIVE'), 8
  from unnest(array['categories', 'monthly_finances', 'expenses', 'budgets', 'profiles']) as t(tabela)
  union all
  select 'Fotos de perfil: bucket "avatars" privado',
         coalesce((select not public from storage.buckets where id = 'avatars'), false), 9
  union all
  select 'Fotos de perfil: 4 políticas, cada um só na própria pasta',
         (select count(*) = 4 from pg_policies
          where schemaname = 'storage' and tablename = 'objects'
            and policyname like 'avatars: % own'
            and roles = '{authenticated}'), 9
  union all
  select 'Funções de sessões: search_path fixo e sem acesso de visitantes',
         coalesce((select bool_and(p.prosecdef
                                   and p.proconfig @> array['search_path=""']
                                   and not has_function_privilege('anon', p.oid, 'execute'))
                          and count(*) = 4
                   from pg_proc p
                   where p.oid in (to_regprocedure('public.list_my_sessions()'),
                                   to_regprocedure('public.revoke_my_session(uuid)'),
                                   to_regprocedure('public.revoke_my_other_sessions()'),
                                   to_regprocedure('private.session_active()'))), false), 9
  union all
  select 'handle_new_user_profile não pode ser chamada pela API',
         coalesce(not has_function_privilege('authenticated', to_regprocedure('public.handle_new_user_profile()'), 'execute')
                  and not has_function_privilege('anon', to_regprocedure('public.handle_new_user_profile()'), 'execute'),
                  false), 9
  union all
  select 'Conta de demonstração: a lista não pode ser lida nem alterada pelos usuários',
         coalesce(not has_table_privilege('authenticated', to_regclass('private.demo_accounts'), 'select')
                  and not has_table_privilege('authenticated', to_regclass('private.demo_accounts'), 'insert,update,delete')
                  and not has_table_privilege('anon', to_regclass('private.demo_accounts'), 'select'),
                  false), 10
  union all
  select 'Conta de demonstração: senha, e-mail, MFA, nome/telefone/foto e sessões travados',
         (select count(*) = 3 from pg_trigger
          where not tgisinternal
            and tgname in ('protect_demo_user', 'protect_demo_mfa', 'protect_demo_profile'))
         and (select count(*) = 3 from pg_policies
              where schemaname = 'storage' and tablename = 'objects'
                and policyname like 'avatars: demo não %' and permissive = 'RESTRICTIVE')
         and coalesce((select bool_and(pg_get_functiondef(p.oid) like '%demo_account_locked%')
                       from pg_proc p
                       where p.oid in (to_regprocedure('public.revoke_my_session(uuid)'),
                                       to_regprocedure('public.revoke_my_other_sessions()'))), false), 10
) resultado
order by ordem, item;
