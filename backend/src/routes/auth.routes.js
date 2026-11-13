import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'

const router = Router()

// Rota de teste: prova que o token enviado pelo frontend chega e é
// validado no backend. As próximas etapas (salário, gastos) vão usar
// o mesmo middleware "requireAuth".
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
  })
})

export default router
