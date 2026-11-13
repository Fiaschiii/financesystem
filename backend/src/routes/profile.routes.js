import express, { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { userWriteLimiter } from '../middlewares/rateLimits.js'
import { rejectForeignUserId } from '../middlewares/ownership.js'
import * as profileController from '../controllers/profileController.js'

const router = Router()

// "Minha conta". Repare: nenhuma rota tem id de usuário na URL. O dono é
// sempre o do token (req.user.id); não existe endereço para o perfil de
// outra pessoa. /api/profile/<id-de-alguém> cai no 404.
router.use(requireAuth, userWriteLimiter, rejectForeignUserId)

router.get('/', profileController.get)
router.put('/', profileController.update)

// A foto vai como o próprio arquivo no corpo (não JSON). Só aqui o limite
// sobe de 10 kB para 2 MB.
const avatarBody = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: profileController.AVATAR_MAX_BYTES,
})
function avatarTooLarge(err, req, res, next) {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Foto grande demais (máximo de 2 MB).' })
  }
  next(err)
}
router.put('/avatar', avatarBody, avatarTooLarge, profileController.uploadAvatar)
router.delete('/avatar', profileController.removeAvatar)

router.get('/sessions', profileController.listSessions)
router.delete('/sessions', profileController.revokeOtherSessions)
router.delete('/sessions/:sessionId', profileController.revokeSession)

export default router
