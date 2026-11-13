// Idioma das mensagens de erro da API (Etapa 18: preferência de idioma).
//
// O backend continua escrevendo as mensagens em português (é o idioma
// "de origem" do código e dos testes). Quando o frontend avisa que a pessoa
// usa outro idioma (cabeçalho Accept-Language: en), o middleware
// localizeResponses traduz o campo "error" da resposta, logo antes de sair.

export const DEFAULT_LANGUAGE = 'pt-BR'

// "en", "en-US", "en-GB,en;q=0.9" -> 'en'; o resto -> 'pt-BR'.
export function languageFromHeader(header) {
  const first = String(header ?? '').split(',')[0].trim().toLowerCase()
  return first === 'en' || first.startsWith('en-') ? 'en' : DEFAULT_LANGUAGE
}

const EN_LABELS = {
  Nome: 'Name',
  Descrição: 'Description',
  Valor: 'Amount',
  Salário: 'Salary',
  Limite: 'Limit',
  Data: 'Date',
  Observação: 'Notes',
  Telefone: 'Phone',
  Idioma: 'Language',
  Tema: 'Theme',
  'Preferência de aviso': 'Notification preference',
  Ícone: 'Icon',
}
const label = (pt) => EN_LABELS[pt] ?? pt

const EN_EXACT = {
  'Token de autenticação ausente': 'Missing authentication token',
  'Token inválido ou expirado': 'Invalid or expired token',
  'Falha ao validar autenticação': 'Could not validate authentication',
  'Falta o código do app autenticador (verificação em duas etapas).':
    'The authenticator app code is missing (two-step verification).',
  'Rota não encontrada.': 'Route not found.',
  'JSON inválido no corpo da requisição.': 'Invalid JSON in the request body.',
  'Corpo da requisição grande demais.': 'Request body too large.',
  'Erro interno do servidor.': 'Internal server error.',
  'Categoria inválida.': 'Invalid category.',
  'Identificador inválido.': 'Invalid identifier.',
  'Mês inválido: use um número de 1 a 12.': 'Invalid month: use a number from 1 to 12.',
  'Tipo inválido: use "fixo" ou "variavel".': 'Invalid type: use "fixo" or "variavel".',
  'Informe month e year juntos (ou nenhum, para o mês atual).':
    'Send month and year together (or neither, for the current month).',
  'Informe ao menos um campo para atualizar.': 'Send at least one field to update.',
  'Caixinha não encontrada.': 'Budget not found.',
  'Categoria não encontrada.': 'Category not found.',
  'Gasto não encontrado.': 'Expense not found.',
  'Registro não encontrado.': 'Record not found.',
  'Já existe um salário cadastrado para este mês. Recarregue a página para editá-lo.':
    'This month already has a salary. Reload the page to edit it.',
  'Já existe uma caixinha para essa categoria neste mês.': 'This category already has a budget this month.',
  'Já existe uma categoria com esse nome.': 'A category with this name already exists.',
  'Não é possível excluir: existem gastos nessa categoria.': 'Cannot delete: this category has expenses.',
  'Muitas requisições em pouco tempo. Aguarde um pouco e tente de novo.':
    'Too many requests in a short time. Wait a moment and try again.',
  'Muitas tentativas com login inválido. Aguarde alguns minutos e entre de novo.':
    'Too many attempts with an invalid login. Wait a few minutes and sign in again.',
  'Muitas alterações em pouco tempo. Aguarde um minuto e tente de novo.':
    'Too many changes in a short time. Wait a minute and try again.',
  // Perfil (Etapa 18)
  'Você só pode ver e alterar a sua própria conta.': 'You can only view and change your own account.',
  'Foto inválida: envie uma imagem JPEG, PNG ou WebP.': 'Invalid photo: send a JPEG, PNG or WebP image.',
  'Foto grande demais (máximo de 2 MB).': 'Photo too large (2 MB maximum).',
  'Sessão inválida.': 'Invalid session.',
  'Sessão não encontrada.': 'Session not found.',
  'Para encerrar a sessão atual, use o botão Sair.': 'To end the current session, use the Sign out button.',
  // Conta de demonstração
  'Indisponível na conta de demonstração.': 'Not available on the demo account.',
  // Painéis do resumo
  'Painéis do resumo inválidos: envie todos os painéis, cada um uma vez.':
    'Invalid summary panels: send every panel, each one once.',
}

// Mensagens dos validadores, que levam o nome do campo e números no meio.
const EN_PATTERNS = [
  [/^Ano inválido: use um valor entre (\d+) e (\d+)\.$/, (m) => `Invalid year: use a value between ${m[1]} and ${m[2]}.`],
  [/^(.+) inválido: informe um número maior ou igual a zero\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: enter a number greater than or equal to zero.`],
  [/^(.+) inválido: informe um número maior que zero\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: enter a number greater than zero.`],
  [/^(.+) alto demais\.$/, (m) => `${label(m[1])} is too high.`],
  [/^(.+) é obrigatório\.$/, (m) => `${label(m[1])} is required.`],
  [/^(.+) muito longo \(máximo de (\d+) caracteres\)\.$/, (m) => `${label(m[1])} is too long (${m[2]} characters maximum).`],
  [/^(.+) inválida: use o formato AAAA-MM-DD\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: use the YYYY-MM-DD format.`],
  [/^(.+) inválida: esse dia não existe no calendário\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: that day does not exist.`],
  [/^(.+) inválida: use um ano entre (\d+) e (\d+)\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: use a year between ${m[2]} and ${m[3]}.`],
  [/^(.+) inválido: informe DDD e número, por exemplo \(11\) 98765-4321\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: enter the area code and number, for example (11) 98765-4321.`],
  [/^(.+) inválido: use (.+)\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}: use ${m[2].replace(/ ou /g, ' or ')}.`],
  [/^(.+) inválid[oa]\.$/, (m) => `Invalid ${label(m[1]).toLowerCase()}.`],
]

export function translateMessage(message, language) {
  if (language !== 'en' || typeof message !== 'string') return message
  if (EN_EXACT[message]) return EN_EXACT[message]
  for (const [pattern, translate] of EN_PATTERNS) {
    const match = pattern.exec(message)
    if (match) return translate(match)
  }
  return message
}

// Middleware: guarda o idioma em req.language e traduz o "error" de toda
// resposta JSON que sair depois dele (inclusive as 429 dos limites).
export function localizeResponses(req, res, next) {
  const language = languageFromHeader(req.headers['accept-language'])
  req.language = language
  res.vary('Accept-Language')

  if (language !== DEFAULT_LANGUAGE) {
    const json = res.json.bind(res)
    res.json = (body) =>
      json(body && typeof body.error === 'string' ? { ...body, error: translateMessage(body.error, language) } : body)
  }
  next()
}
