import { Router } from 'express'
import { AdminStatsController } from '@/controllers/admin/adminStats.controller'

const router = Router()

router.get('/overview', AdminStatsController.getOverview)
router.get('/daily-traffic', AdminStatsController.getDailyTraffic)
router.get('/hourly-traffic', AdminStatsController.getHourlyTraffic)
router.get('/popular-templates', AdminStatsController.getPopularTemplates)
router.get('/cards-by-category', AdminStatsController.getCardsByCategory)
router.get('/online-users', AdminStatsController.getOnlineUsers)
router.get('/geographic', AdminStatsController.getGeographicStats)
router.get('/revenue', AdminStatsController.getRevenue)
router.get('/', AdminStatsController.getLegacyStats)

export default router

