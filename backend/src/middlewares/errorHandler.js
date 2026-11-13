import { ValidationError } from '../utils/validators.js'

// O Express 4 não captura erros de funções async sozinho: sem este wrapper,
// uma falha do Supabase viraria uma requisição pendurada (ou derrubaria o
// servidor). Aqui o erro é repassado ao errorHandler abaixo.
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' })
}

// O Express reconhece um handler de erro pelos 4 parâmetros — não remova o "next".
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message })
  }

  // JSON malformado no corpo da requisição
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição.' })
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição grande demais.' })
  }

  // Trava da conta de demonstração no banco (migração 0007). O backend já
  // recusa antes; isto cobre o que escapar (ex.: um caminho novo no futuro).
  if (err?.message === 'demo_account_locked') {
    return res.status(403).json({ error: 'Indisponível na conta de demonstração.', code: 'demo_locked' })
  }

  console.error(err)

  const body = { error: 'Erro interno do servidor.' }
  // Em desenvolvimento, mostra o motivo real (ex: "tabela não encontrada").
  if (process.env.NODE_ENV !== 'production') {
    body.detail = err?.message
  }
  res.status(500).json(body)
}
