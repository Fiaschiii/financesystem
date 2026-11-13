-- ============================================================
-- Controle Financeiro Pessoal — Etapa 15: verificação em duas etapas (MFA)
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole tudo > Run
-- Rode depois da 0003. Roda dentro de uma transação: se algo falhar, nada
-- é aplicado.
--
-- O que muda: quem ATIVOU o app autenticador (Microsoft Authenticator etc.)
-- só lê e grava os próprios dados com uma sessão "aal2" — ou seja, depois
-- de digitar o código do app. Só a senha (sessão "aal1") não basta mais.
-- Quem não ativou continua igual.
--
-- O backend já confere isso (middlewares/auth.js). A regra aqui no banco é
-- para quem tentar falar direto com a API do Supabase, pulando o backend.
-- ------------------------------------------------------------

begin;

-- ------------------------------------------------------------
-- 1) A função que decide
--
-- Fica no schema "private", que a API do Supabase não expõe. É "security
-- definer" porque precisa ler auth.mfa_factors (os apps cadastrados), que o
-- papel dos usuários logados não lê diretamente. search_path vazio e nomes
-- com schema, como nas outras funções (ver 0003).
-- ------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1
        from auth.mfa_factors f
        where f.user_id = (select auth.uid())
          and f.status = 'verified'
      )
$$;

revoke execute on function private.mfa_satisfied() from public, anon;
grant execute on function private.mfa_satisfied() to authenticated;

-- ------------------------------------------------------------
-- 2) Uma política RESTRITIVA por tabela
--
-- As políticas da 0003 ("cada um só vê o que é seu") são permissivas. Uma
-- política restritiva SOMA uma condição a todas elas: para ler ou gravar,
-- precisa ser o dono E estar com o MFA em dia.
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'monthly_finances', 'expenses', 'budgets'] loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
         using ((select private.mfa_satisfied()))
         with check ((select private.mfa_satisfied()))',
      t || ': mfa', t);
  end loop;
end;
$$;

commit;
