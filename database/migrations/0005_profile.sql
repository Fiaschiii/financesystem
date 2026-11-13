-- ============================================================
-- Controle Financeiro Pessoal — Etapa 18: Minha conta (perfil)
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole tudo > Run
-- Rode depois da 0004. Roda dentro de uma transação: se algo falhar, nada
-- é aplicado.
--
-- O que cria:
-- 1) public.profiles: nome, telefone, foto e preferências (idioma, tema,
--    avisos) de cada usuário. Uma linha por conta, com o MESMO id do
--    auth.users: não existe "id do perfil" separado para alguém trocar.
-- 2) Bucket "avatars" (fotos de perfil), privado: cada um só mexe na pasta
--    com o próprio id.
-- 3) Sessões ativas: funções para listar e encerrar as sessões de quem
--    está logado. Nenhuma recebe um id de usuário: todas usam auth.uid(),
--    que vem do token assinado pelo Supabase.
-- 4) Sessão encerrada morre na hora: uma política restritiva em todas as
--    tabelas (e nas fotos) recusa tokens cuja sessão já foi apagada.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Perfil
-- ------------------------------------------------------------

create table public.profiles (
  -- O id É o do usuário (chave primária e estrangeira ao mesmo tempo).
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  -- Formato internacional (E.164): +5511987654321. O backend normaliza.
  phone text,
  -- Caminho do arquivo no bucket "avatars": "<id do usuário>/<arquivo>".
  avatar_path text,
  language text not null default 'pt-BR',
  theme text not null default 'auto',
  notify_budget_alerts boolean not null default true,
  notify_missing_salary boolean not null default true,
  notify_mfa_reminder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Mesmos limites do backend (utils/validators.js), para quem falar
  -- direto com a API do Supabase.
  constraint profiles_full_name_check
    check (full_name is null or (btrim(full_name) <> '' and char_length(full_name) <= 100)),
  constraint profiles_phone_check
    check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- A foto só pode apontar para a pasta do próprio dono.
  constraint profiles_avatar_path_check
    check (avatar_path is null or (
      char_length(avatar_path) <= 200 and avatar_path like id::text || '/%'
    )),
  constraint profiles_language_check check (language in ('pt-BR', 'en')),
  constraint profiles_theme_check check (theme in ('auto', 'light', 'dark'))
);

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Cada um lê, cria e altera só a própria linha (id = auth.uid()). Sem
-- política de delete: o perfil some junto com a conta (on delete cascade).
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Mesma regra do MFA das outras tabelas (ver 0004).
create policy "profiles: mfa" on public.profiles
  as restrictive for all to authenticated
  using ((select private.mfa_satisfied()))
  with check ((select private.mfa_satisfied()));

-- Perfil criado junto com a conta.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Contas que já existiam ganham o perfil agora.
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2) Sessão ativa
--
-- O token (JWT) do Supabase vale por até 1 hora e traz o id da sessão
-- (session_id). Encerrar a sessão apaga a linha em auth.sessions, mas um
-- token já emitido continuaria aceito pela API do Supabase até expirar. Com
-- esta função numa política restritiva, o banco recusa o token na hora.
-- ------------------------------------------------------------

create or replace function private.session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id::text = (auth.jwt() ->> 'session_id')
      and s.user_id = (select auth.uid())
  )
$$;

revoke execute on function private.session_active() from public, anon;
grant execute on function private.session_active() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'monthly_finances', 'expenses', 'budgets', 'profiles'] loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
         using ((select private.session_active()))
         with check ((select private.session_active()))',
      t || ': sessão ativa', t);
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 3) Fotos de perfil (Supabase Storage)
--
-- Bucket privado: a foto só abre por um link assinado e temporário, que o
-- backend gera para o próprio dono. Limite de 2 MB e só JPEG, PNG ou WebP
-- (o frontend já reduz a foto para 256×256 antes de enviar).
-- O primeiro pedaço do caminho é a pasta do dono: "<id>/arquivo.jpg".
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: select own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.mfa_satisfied())
    and (select private.session_active())
  );

create policy "avatars: insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.mfa_satisfied())
    and (select private.session_active())
  );

create policy "avatars: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.mfa_satisfied())
    and (select private.session_active())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.mfa_satisfied())
    and (select private.session_active())
  );

-- ------------------------------------------------------------
-- 4) Sessões ativas
--
-- auth.sessions não é exposta pela API, então o acesso é por funções
-- "security definer". NENHUMA recebe um id de usuário: o dono é sempre
-- auth.uid() (o "sub" do token assinado). Pedir para encerrar a sessão de
-- outra pessoa simplesmente não encontra nada.
-- ------------------------------------------------------------

create or replace function public.list_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  last_active_at timestamptz,
  user_agent text,
  ip text,
  aal text,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.created_at,
    greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'UTC') as last_active_at,
    s.user_agent,
    host(s.ip),
    s.aal::text,
    s.id::text = (auth.jwt() ->> 'session_id') as is_current
  from auth.sessions s
  where s.user_id = (select auth.uid())
    and (s.not_after is null or s.not_after > now())
    and (select private.mfa_satisfied())
  order by is_current desc, last_active_at desc
$$;

-- Encerra UMA sessão do próprio usuário. Devolve false se não achou (não
-- existe, já foi encerrada ou é de outra pessoa: o resultado é o mesmo, de
-- propósito, para não revelar se o id existe). A sessão atual não entra:
-- para ela existe o "Sair".
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

  delete from auth.sessions s
  where s.id = target_session_id
    and s.user_id = (select auth.uid())
    and s.id::text is distinct from (auth.jwt() ->> 'session_id');

  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

-- "Sair de todos os outros aparelhos": todas as sessões do usuário, menos
-- a atual. Devolve quantas foram encerradas.
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
  -- Sem o id da sessão atual no token, não dá para saber qual poupar.
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

revoke execute on function public.list_my_sessions() from public, anon;
revoke execute on function public.revoke_my_session(uuid) from public, anon;
revoke execute on function public.revoke_my_other_sessions() from public, anon;
grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;
grant execute on function public.revoke_my_other_sessions() to authenticated;

commit;
