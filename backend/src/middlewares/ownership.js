// Regra de ouro do perfil: o dono é SEMPRE o usuário do token (req.user.id,
// validado pelo requireAuth), nunca um id que veio da requisição.
//
// As rotas de /api/profile nem têm id de usuário na URL, e os serviços
// filtram pelo req.user.id. Este middleware é uma camada a mais: se o
// corpo ou a query trouxerem um id de usuário DIFERENTE do logado (alguém
// editou a requisição para mexer na conta de outra pessoa), a requisição é
// recusada com 403 e a tentativa fica registrada no log do servidor.
// O mesmo id do logado é tolerado, mas nunca é usado.

const USER_ID_KEYS = ['id', 'user_id', 'userId', 'owner', 'owner_id']

function foreignKeyIn(source, userId) {
  if (!source || typeof source !== 'object' || Buffer.isBuffer(source)) return null
  return USER_ID_KEYS.find((key) => source[key] !== undefined && source[key] !== userId) ?? null
}

export function rejectForeignUserId(req, res, next) {
  const userId = req.user.id
  const key = foreignKeyIn(req.body, userId) ?? foreignKeyIn(req.query, userId)

  if (key) {
    const value = String(req.body?.[key] ?? req.query?.[key]).slice(0, 64)
    console.warn(
      `[segurança] usuário ${userId} tentou usar ${key}="${value}" em ${req.method} ${req.originalUrl}: recusado (403).`
    )
    return res.status(403).json({
      error: 'Você só pode ver e alterar a sua própria conta.',
      code: 'forbidden_user',
    })
  }
  next()
}
