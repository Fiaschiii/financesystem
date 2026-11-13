import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { userWriteLimiter } from '../middlewares/rateLimits.js'
import * as expenseController from '../controllers/expenseController.js'

const router = Router()

router.use(requireAuth, userWriteLimiter)

router.get('/', expenseController.list)
router.post('/', expenseController.create)
router.put('/:id', expenseController.update)
router.delete('/:id', expenseController.remove)

export default router
