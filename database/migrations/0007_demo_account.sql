-- ============================================================
-- Controle Financeiro Pessoal — Trava da conta de demonstração
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole tudo > Run
-- Rode depois da 0006. Roda dentro de uma transação: se algo falhar, nada
-- é aplicado.
--
-- Para o portfólio, uma conta de demonstração tem o login e a senha
-- publicados no README: todo visitante entra com ela. Sem trava, um só
-- visitante poderia trocar a senha (e ninguém mais entraria), ativar a
-- verificação em duas etapas (idem), pôr nome ou foto ofensivos ou derrubar
-- os outros visitantes. Aqui o BANCO recusa essas mudanças, venham do
-- sistema ou direto da API do Supabase.
--
-- O que fica travado na conta marcada como demonstração:
--   senha, e-mail, verificação em duas etapas, nome, telefone, foto e
--   encerrar sessões (uma ou "todas as outras").
-- O que continua livre: salários, gastos, categorias, caixinhas, painéis do
-- Resumo, idioma, tema e avisos.
--
-- Contas normais não mudam em nada.
--
-- Como marcar a conta (depois de criá-la pelo site e confirmar o e-mail):
--   insert into private.demo_accounts (user_id)
--   select id from auth.users where email = 'demo@exemplo.com';
--
-- Para mexer você mesmo na conta (ex.: redefinir a senha), tire a marca,
-- faça a mudança e marque de novo:
--   delete from private.demo_accounts
--   where user_id = (select id from auth.users where email = 'demo@exemplo.com');
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Quais contas são de demonstração
--
-- Fica no schema "private" (a API do Supabase não expõe) e sem permissão
-- nenhuma para os usuários: só você, pelo SQL Editor, marca ou desmarca.
-- ------------------------------------------------------------

create table private.demo_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on table private.demo_accounts from public, anon, authenticated;

create or replace function private.is_demo_account(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.demo_accounts d where d.user_id = target)
$$;

revoke execute on function private.is_demo_account(uuid) from public, anon;
grant execute on function private.is_demo_account(uuid) to authenticated;

-- Para o sistema saber se mostra os botões travados. Responde só sobre
-- quem está logado (auth.uid()).
create or replace function public.is_demo_account()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_demo_account((select auth.uid()))
$$;

revoke execute on function public.is_demo_account() from public, anon;
grant execute on function public.is_demo_account() to authenticated;

-- ------------------------------------------------------------
-- 2) Senha e e-mail (auth.users)
--
-- A troca de senha e de e-mail vai direto da tela para o Supabase Auth, sem
-- passar pelo backend. Por isso a trava é um gatilho na própria tabela de
-- usuários. "security definer": quem grava em auth.users é o serviço de
-- login, que não enxerga o schema private.
--
-- O resto da linha (último login, confirmação de e-mail etc.) continua
-- mudando normalmente: entrar e sair da conta funciona.
-- ------------------------------------------------------------

create or replace function private.protect_demo_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_demo_account(old.id) and (
       new.encrypted_password is distinct from old.encrypted_password
    or new.email is distinct from old.email
    -- Pedido de troca de e-mail: o Supabase guarda o e-mail novo aqui até a
    -- confirmação. Limpar o pedido continua permitido.
    or (coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change)
  ) then
    raise exception 'demo_account_locked'
      using errcode = '42501',
            hint = 'Conta de demonstração: senha e e-mail não podem ser alterados.';
  end if;
  return new;
end;
$$;

revoke execute on function private.protect_demo_user() from public, anon, authenticated;

create trigger protect_demo_user
  before update on auth.users
  for each row execute function private.protect_demo_user();

-- ------------------------------------------------------------
-- 3) Verificação em duas etapas (auth.mfa_factors)
--
-- Ativar o app autenticador cria uma linha aqui. Na conta de demonstração,
-- isso é recusado: um visitante não tranca os outros do lado de fora.
-- ------------------------------------------------------------

create or replace function private.protect_demo_mfa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_demo_account(new.user_id) then
    raise exception 'demo_account_locked'
      using errcode = '42501',
            hint = 'Conta de demonstração: a verificação em duas etapas não pode ser ativada.';
  end if;
  return new;
end;
$$;

revoke execute on function private.protect_demo_mfa() from public, anon, authenticated;

create trigger protect_demo_mfa
  before insert on auth.mfa_factors
  for each row execute function private.protect_demo_mfa();

-- ------------------------------------------------------------
-- 4) Nome, telefone e foto (public.profiles)
--
-- Idioma, tema, avisos e painéis continuam livres.
-- ------------------------------------------------------------

create or replace function private.protect_demo_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_demo_account(old.id) and (
       new.full_name is distinct from old.full_name
    or new.phone is distinct from old.phone
    or new.avatar_path is distinct from old.avatar_path
  ) then
    raise exception 'demo_account_locked'
      using errcode = '42501',
            hint = 'Conta de demonstração: nome, telefone e foto não podem ser alterados.';
  end if;
  return new;
end;
$$;

revoke execute on function private.protect_demo_profile() from public, anon, authenticated;

create trigger protect_demo_profile
  before update on public.profiles
  for each row execute function private.protect_demo_profile();

-- Arquivos de foto: a conta de demonstração não envia, troca nem apaga.
-- Políticas restritivas se somam às da 0005. Ver a foto continua permitido
-- (se você pôs uma antes de marcar a conta, ela aparece normalmente).
create policy "avatars: demo não envia" on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'avatars' or not private.is_demo_account((select auth.uid())));

create policy "avatars: demo não troca" on storage.objects
  as restrictive for update to authenticated
  using (bucket_id <> 'avatars' or not private.is_demo_account((select auth.uid())));

create policy "avatars: demo não apaga" on storage.objects
  as restrictive for delete to authenticated
  using (bucket_id <> 'avatars' or not private.is_demo_account((select auth.uid())));

-- ------------------------------------------------------------
-- 5) Encerrar sessões
--
-- Vários visitantes usam a conta ao mesmo tempo: "encerrar" derrubaria os
-- outros. As funções da 0005 ganham a trava (o resto é igual).
-- ------------------------------------------------------------

create or replace function public.revoke_my_session(target_session_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if not (select private.mfa_satisfied()) then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if private.is_demo_account((select auth.uid())) then
    raise exception 'demo_account_locked' using errcode = '42501';
  end if;

  delete from auth.sessions s
  where s.id = target_session_id
    and s.user_id = (select auth.uid())
    and s.id::text is distinct from (auth.jwt() ->> 'session_id');

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

create or replace function public.revoke_my_other_sessions()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_session text := auth.jwt() ->> 'session_id';
  removed integer;
begin
  if not (select private.mfa_satisfied()) then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  if private.is_demo_account((select auth.uid())) then
    raise exception 'demo_account_locked' using errcode = '42501';
  end if;
  if current_session is null then
    return 0;
  end if;

  delete from auth.sessions s
  where s.user_id = (select auth.uid())
    and s.id::text <> current_session;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

commit;
