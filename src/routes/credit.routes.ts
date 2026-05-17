import { Router } from 'express'
import { CreditController } from '@/controllers/credit.controller'
import { verifyToken } from '@/middleware/auth.middleware'
import { apiRateLimit } from '@/middleware/rateLimit'
import { validate, createOrderSchema } from '@/middleware/validate'

const router = Router()

// Public: list packages
router.get('/packages', CreditController.getPackages)

// Authenticated routes
router.use(verifyToken)

router.get('/balance', CreditController.getBalance)

router.post('/orders', apiRateLimit, validate(createOrderSchema), CreditController.createOrder)
router.get('/orders', CreditController.getOrders)
router.get('/orders/:id', CreditController.getOrderById)
router.get('/orders/:id/poll', apiRateLimit, CreditController.pollOrder)

export default router
