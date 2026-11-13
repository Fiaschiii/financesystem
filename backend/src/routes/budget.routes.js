import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { userWriteLimiter } from '../middlewares/rateLimits.js'
import * as budgetController from '../controllers/budgetController.js'

const router = Router()

router.use(requireAuth, userWriteLimiter)

router.get('/', budgetController.list)
router.post('/', budgetController.create)
router.put('/:id', budgetController.update)
router.delete('/:id', budgetController.remove)

export default router
