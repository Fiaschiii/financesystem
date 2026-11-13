-- ============================================================
-- Controle Financeiro Pessoal — Painéis do Resumo personalizáveis
-- Rode no Supabase: Dashboard > SQL Editor > New query > cole tudo > Run
-- Rode depois da 0005. Roda dentro de uma transação: se algo falhar, nada
-- é aplicado.
--
-- O que cria:
-- 1) profiles.dashboard_panels: a ordem e o ícone dos painéis (cartões) do
--    Resumo, escolhidos na tela Configurações. Fica no perfil, como o tema e
--    o idioma: a escolha acompanha a pessoa em qualquer navegador.
--    null = padrão do sistema.
-- 2) A mesma validação do backend no banco, para quem falar direto com a
--    API do Supabase: lista com os 6 painéis, cada um uma vez, e só os
--    campos "id" e "icon". A lista de ícones aceitos fica só no backend (e o
--    frontend usa o ícone padrão se receber um que não conhece): assim, um
--    ícone novo não exige outra migração.
--
-- Formato: [{"id": "salary", "icon": "wallet"}, {"id": "spent", "icon": "cart"}, ...]
-- ============================================================

begin;

-- Fica no schema "private" (não exposto pela API). Não é security definer:
-- só olha o valor recebido, não lê tabela nenhuma.
create or replace function private.dashboard_panels_valid(panels jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(panels) <> 'array' or jsonb_array_length(panels) <> 6 then false
    else (
      select count(distinct p.value ->> 'id') = 6
             and bool_and(
               case
                 when jsonb_typeof(p.value) <> 'object' then false
                 else (p.value ->> 'id') in ('salary', 'spent', 'balance', 'fixed', 'variable', 'percent')
                      and coalesce((p.value ->> 'icon') ~ '^[a-zA-Z]{1,30}$', false)
                      and (p.value - 'id' - 'icon') = '{}'::jsonb
               end)
      from jsonb_array_elements(panels) as p(value)
    )
  end
$$;

revoke execute on function private.dashboard_panels_valid(jsonb) from public, anon;
grant execute on function private.dashboard_panels_valid(jsonb) to authenticated;

alter table public.profiles
  add column dashboard_panels jsonb,
  add constraint profiles_dashboard_panels_check
    check (dashboard_panels is null or private.dashboard_panels_valid(dashboard_panels));

commit;
