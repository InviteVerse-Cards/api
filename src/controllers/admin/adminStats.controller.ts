import type { Request, Response, NextFunction } from 'express'
import { success } from '@/utils/response'
import { StatsService } from '@/services/stats.service'

export const AdminStatsController = {
  getOverview: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getOverview()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getDailyTraffic: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getDailyTraffic()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getHourlyTraffic: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getHourlyTraffic()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getPopularTemplates: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getPopularTemplates()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getCardsByCategory: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getCardsByCategory()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getOnlineUsers: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getOnlineUsers()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getRevenue: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getRevenue()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  },

  getLegacyStats: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await StatsService.getLegacyStats()
      return res.json(success(data))
    } catch (err) {
      next(err)
    }
  }
}
