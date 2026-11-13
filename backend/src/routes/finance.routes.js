import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { userWriteLimiter } from '../middlewares/rateLimits.js'
import * as financeController from '../controllers/financeController.js'

const router = Router()

// Tudo aqui exige usuário autenticado.
router.use(requireAuth, userWriteLimiter)

router.get('/', financeController.listAll)
router.get('/current', financeController.getCurrent)
router.get('/:year/:month', financeController.getByMonth)
router.post('/', financeController.create)
router.put('/:id', financeController.update)

export default router
