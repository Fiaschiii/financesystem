import { Router } from 'express'
import { requireAuth } from '../middlewares/auth.js'
import { userWriteLimiter } from '../middlewares/rateLimits.js'
import * as categoryController from '../controllers/categoryController.js'

const router = Router()

router.use(requireAuth, userWriteLimiter)

router.get('/', categoryController.list)
router.post('/', categoryController.create)
router.put('/:id', categoryController.update)
router.delete('/:id', categoryController.remove)

export default router
