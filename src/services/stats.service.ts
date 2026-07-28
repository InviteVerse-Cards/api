import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export const StatsService = {
  async getOverview() {
    interface OverviewStats extends RowDataPacket {
      total_users: number
      active_users: number
      total_invitations: number
      published_invitations: number
      total_orders: number
      paid_orders: number
      total_revenue: string | null
      today_revenue: string | null
      today_users: number
      today_invitations: number
    }

    const [[stats]] = await pool.query<OverviewStats[]>(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = 1) AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 1 AND credits_balance > 0) AS active_users,
        (SELECT COUNT(*) FROM invitations WHERE deleted_at IS NULL) AS total_invitations,
        (SELECT COUNT(*) FROM invitations WHERE status = 'published' AND deleted_at IS NULL) AS published_invitations,
        (SELECT COUNT(*) FROM credit_orders) AS total_orders,
        (SELECT COUNT(*) FROM credit_orders WHERE status = 'paid') AS paid_orders,
        (SELECT SUM(amount) FROM credit_orders WHERE status = 'paid') AS total_revenue,
        (SELECT SUM(amount) FROM credit_orders WHERE status = 'paid' AND DATE(DATE_ADD(paid_at, INTERVAL 7 HOUR)) = DATE(DATE_ADD(NOW(), INTERVAL 7 HOUR))) AS today_revenue,
        (SELECT COUNT(*) FROM users WHERE DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) = DATE(DATE_ADD(NOW(), INTERVAL 7 HOUR))) AS today_users,
        (SELECT COUNT(*) FROM invitations WHERE DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) = DATE(DATE_ADD(NOW(), INTERVAL 7 HOUR)) AND deleted_at IS NULL) AS today_invitations
    `)

    interface RecentOrderRow extends RowDataPacket {
      id: number
      user_id: number
      package_id: number | null
      credits: number
      amount: string
      topup_code: string
      status: string
      created_at: Date
      paid_at: Date | null
      user_name: string | null
      user_email: string | null
      package_name: string | null
    }

    const [recentOrders] = await pool.query<RecentOrderRow[]>(`
      SELECT o.*, u.full_name as user_name, u.email as user_email, p.name as package_name
      FROM credit_orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN credit_packages p ON o.package_id = p.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `)

    return {
      ...stats,
      total_revenue: stats.total_revenue ? Number(stats.total_revenue) : 0,
      today_revenue: stats.today_revenue ? Number(stats.today_revenue) : 0,
      recent_orders: recentOrders
    }
  },

  async getDailyTraffic() {
    interface TrafficRow extends RowDataPacket {
      date: string
      page_views: number
      unique_visitors: number
    }
    const [rows] = await pool.query<TrafficRow[]>(`
      SELECT
        DATE_FORMAT(DATE_ADD(created_at, INTERVAL 7 HOUR), '%Y-%m-%d') as date,
        COUNT(*) as page_views,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_view_logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(DATE_ADD(created_at, INTERVAL 7 HOUR), '%Y-%m-%d')
      ORDER BY date ASC
    `)
    return rows
  },

  async getHourlyTraffic() {
    interface HourlyRow extends RowDataPacket {
      hour: number
      page_views: number
    }
    const [rows] = await pool.query<HourlyRow[]>(`
      SELECT
        HOUR(DATE_ADD(created_at, INTERVAL 7 HOUR)) as hour,
        COUNT(*) as page_views
      FROM page_view_logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY HOUR(DATE_ADD(created_at, INTERVAL 7 HOUR))
      ORDER BY hour ASC
    `)
    return rows
  },

  async getPopularTemplates() {
    interface TemplateRow extends RowDataPacket {
      id: number
      name: string
      thumbnail_url: string | null
      plan_required: string
      category_name: string | null
      use_count: number
    }
    const [rows] = await pool.query<TemplateRow[]>(`
      SELECT t.id, t.name, t.thumbnail_url, t.plan_required, c.name as category_name, COUNT(i.id) as use_count
      FROM templates t
      LEFT JOIN template_categories c ON t.category_id = c.id
      LEFT JOIN invitations i ON i.template_id = t.id AND i.deleted_at IS NULL
      GROUP BY t.id, t.name, t.thumbnail_url, t.plan_required, c.name
      ORDER BY use_count DESC
      LIMIT 10
    `)
    return rows
  },

  async getCardsByCategory() {
    interface CategoryRow extends RowDataPacket {
      category: string
      count: number
    }
    const [rows] = await pool.query<CategoryRow[]>(`
      SELECT category, COUNT(*) as count
      FROM invitations
      WHERE deleted_at IS NULL
      GROUP BY category
      ORDER BY count DESC
    `)
    return rows
  },

  async getOnlineUsers() {
    interface OnlineSummaryRow extends RowDataPacket {
      total_online: number
      registered_online: number
      anonymous_online: number
    }
    const [[summary]] = await pool.query<OnlineSummaryRow[]>(`
      SELECT
        COUNT(*) as total_online,
        SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as registered_online,
        SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as anonymous_online
      FROM online_heartbeats
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)
    `)

    interface PageRow extends RowDataPacket {
      page: string
      count: number
    }
    const [pages] = await pool.query<PageRow[]>(`
      SELECT page, COUNT(*) as count
      FROM online_heartbeats
      WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)
      GROUP BY page
      ORDER BY count DESC
    `)

    interface RecentOnlineRow extends RowDataPacket {
      session_id: string
      user_id: number | null
      page: string | null
      ip_address: string | null
      last_seen: Date
      user_name: string | null
      user_email: string | null
    }
    const [recentUsers] = await pool.query<RecentOnlineRow[]>(`
      SELECT h.*, u.full_name as user_name, u.email as user_email
      FROM online_heartbeats h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.last_seen >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)
      ORDER BY h.last_seen DESC
      LIMIT 20
    `)

    return {
      total_online: summary?.total_online ?? 0,
      registered_online: summary?.registered_online ?? 0,
      anonymous_online: summary?.anonymous_online ?? 0,
      pages,
      recent_users: recentUsers
    }
  },

  async getRevenue() {
    interface DailyRevenueRow extends RowDataPacket {
      date: string
      revenue: string
    }
    const [daily] = await pool.query<DailyRevenueRow[]>(`
      SELECT
        DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR), '%Y-%m-%d') as date,
        SUM(amount) as revenue
      FROM credit_orders
      WHERE status = 'paid' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR), '%Y-%m-%d')
      ORDER BY date ASC
    `)

    interface MonthlyRevenueRow extends RowDataPacket {
      month: string
      revenue: string
    }
    const [monthly] = await pool.query<MonthlyRevenueRow[]>(`
      SELECT
        DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR), '%Y-%m') as month,
        SUM(amount) as revenue
      FROM credit_orders
      WHERE status = 'paid' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR), '%Y-%m')
      ORDER BY month ASC
    `)

    interface PackageStatsRow extends RowDataPacket {
      package_name: string
      count: number
      revenue: string
    }
    const [packages] = await pool.query<PackageStatsRow[]>(`
      SELECT
        COALESCE(p.name, 'Gói Tùy Chỉnh') as package_name,
        COUNT(*) as count,
        SUM(o.amount) as revenue
      FROM credit_orders o
      LEFT JOIN credit_packages p ON o.package_id = p.id
      WHERE o.status = 'paid'
      GROUP BY o.package_id, p.name
      ORDER BY count DESC
    `)

    return {
      daily: daily.map(r => ({ ...r, revenue: Number(r.revenue) })),
      monthly: monthly.map(r => ({ ...r, revenue: Number(r.revenue) })),
      packages: packages.map(r => ({ ...r, revenue: Number(r.revenue) }))
    }
  },

  async getLegacyStats() {
    interface StatsRow extends RowDataPacket {
      total_users: number
      active_users: number
      total_invitations: number
      published_invitations: number
      total_orders: number
      paid_orders: number
    }
    const [[stats]] = await pool.query<StatsRow[]>(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = 1)             AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 1 AND credits_balance > 0) AS active_users,
        (SELECT COUNT(*) FROM invitations WHERE deleted_at IS NULL)  AS total_invitations,
        (SELECT COUNT(*) FROM invitations WHERE status = 'published' AND deleted_at IS NULL) AS published_invitations,
        (SELECT COUNT(*) FROM credit_orders)                         AS total_orders,
        (SELECT COUNT(*) FROM credit_orders WHERE status = 'paid')   AS paid_orders
    `)
    return stats
  },

  async getGeographicStats() {
    interface GeoCityRow extends RowDataPacket {
      city: string
      country: string
      visits: number
      unique_visitors: number
    }

    const [cities] = await pool.query<GeoCityRow[]>(`
      SELECT
        COALESCE(city, 'Chưa xác định') as city,
        COALESCE(country, 'VN') as country,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_visitors
      FROM page_view_logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY city, country
      ORDER BY visits DESC
      LIMIT 15
    `)

    interface GeoCountryRow extends RowDataPacket {
      country: string
      visits: number
    }

    const [countries] = await pool.query<GeoCountryRow[]>(`
      SELECT
        COALESCE(country, 'Khác') as country,
        COUNT(*) as visits
      FROM page_view_logs
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY country
      ORDER BY visits DESC
      LIMIT 10
    `)

    return {
      cities,
      countries
    }
  },

  async getIpLogs(params: { page?: number; limit?: number; q?: string }) {
    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 15))
    const offset = (page - 1) * limit
    const search = params.q ? `%${params.q.trim()}%` : null

    let whereClause = ''
    const queryParams: any[] = []

    if (search) {
      whereClause = `WHERE (l.ip_address LIKE ? OR l.city LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)`
      queryParams.push(search, search, search, search)
    }

    interface CountRow extends RowDataPacket {
      total: number
    }
    const [[countResult]] = await pool.query<CountRow[]>(
      `SELECT COUNT(DISTINCT l.ip_address) as total
       FROM page_view_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}`,
      queryParams
    )
    const total = countResult?.total ?? 0

    interface IpLogRow extends RowDataPacket {
      ip_address: string
      city: string | null
      country: string | null
      total_views: number
      last_active: Date
      users_associated: string | null
    }

    const [rows] = await pool.query<IpLogRow[]>(
      `SELECT
         l.ip_address,
         MAX(l.city) as city,
         MAX(l.country) as country,
         COUNT(l.id) as total_views,
         MAX(l.created_at) as last_active,
         GROUP_CONCAT(DISTINCT CONCAT(COALESCE(u.full_name, 'Khách'), ' (', COALESCE(u.email, 'Ẩn danh'), ')') SEPARATOR ', ') as users_associated
       FROM page_view_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ${whereClause}
       GROUP BY l.ip_address
       ORDER BY last_active DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  },

  async cleanupTrafficLogs(days: number) {
    const safeDays = Math.max(7, Math.min(365, Number(days) || 30))

    const [resPv] = await pool.query<ResultSetHeader>(
      `DELETE FROM page_view_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [safeDays]
    )

    const [resFe] = await pool.query<ResultSetHeader>(
      `DELETE FROM feature_events WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [safeDays]
    )

    return {
      deleted_page_views: resPv.affectedRows ?? 0,
      deleted_feature_events: resFe.affectedRows ?? 0,
      days_retained: safeDays
    }
  }
}
