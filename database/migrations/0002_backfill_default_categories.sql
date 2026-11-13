-- ============================================================
-- Controle Financeiro Pessoal — Etapa 6: categorias padrão para contas antigas
-- Rode no Supabase: Dashboard > SQL Editor > New query
--
-- Quando rodar: só se o seletor de categorias do formulário de gastos vier
-- vazio. Isso acontece com contas criadas ANTES do gatilho da Etapa 3
-- (o gatilho só semeia as categorias de quem se cadastra depois dele).
--
-- É seguro rodar mais de uma vez: só cria categorias para quem não tem
-- NENHUMA — então não recria as que alguém apagar de propósito depois
-- (a exclusão de categorias chega na Etapa 7).
-- ============================================================

insert into public.categories (user_id, name)
select u.id, c.name
from auth.users u
cross join (values
  ('Faculdade'), ('Internet'), ('Alimentação'), ('Transporte'), ('Lazer'),
  ('Saúde'), ('Assinaturas'), ('Moradia'), ('Compras'), ('Outros')
) as c(name)
where not exists (
  select 1 from public.categories existing where existing.user_id = u.id
)
on conflict (user_id, name) do nothing;
