import type { Request, Response, NextFunction } from 'express'
import pool from '@/config/database'
import type { ResultSetHeader } from 'mysql2'
import { AiService } from '@/services/ai.service'
import { success, createError } from '@/utils/response'

const CREDIT_COST = 1

async function deductCredit(userId: number): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET credits_balance = credits_balance - ? WHERE id = ? AND credits_balance >= ?`,
    [CREDIT_COST, userId, CREDIT_COST]
  )
  if (result.affectedRows === 0) {
    throw createError('INSUFFICIENT_CREDITS', 'Không đủ lượt để thực hiện', 402)
  }
  const [[row]] = await pool.query<Array<{ credits_balance: number } & import('mysql2').RowDataPacket>>(
    'SELECT credits_balance FROM users WHERE id = ?', [userId]
  )
  return row.credits_balance
}

export const AIController = {
  async generateText(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, context } = req.body as {
        type: 'invitation_message' | 'greeting' | 'wishes'
        context: Record<string, string>
      }

      if (!type || !context) {
        return next(createError('VALIDATION_ERROR', 'Thiếu type hoặc context', 400))
      }

      const category = context.category || 'wedding'
      const tone = context.tone || 'lịch sự, ấm áp'
      const categoryLabel = category === 'wedding' ? 'đám cưới' : 'sinh nhật'

      const systemPrompt = `Bạn là chuyên gia viết lời mời và thiệp chúc mừng cho người Việt Nam.
Viết theo phong cách: ${tone}.
Ngôn ngữ: Tiếng Việt.
Output: JSON thuần túy, không có markdown, không có giải thích.`

      const userPromptMap: Record<string, string> = {
        invitation_message: `Viết lời mời cho thiệp ${categoryLabel}.
Thông tin: ${JSON.stringify(context)}
Output format: {"main_text":"...","alternatives":["...","..."]}`,
        greeting: `Viết tagline ngắn (dưới 20 chữ) cho thiệp ${categoryLabel}.
Phong cách: ${tone}
Output format: {"text":"...","alternatives":["...","..."]}`,
        wishes: `Viết 3 lời chúc cho thiệp ${categoryLabel}.
Output format: {"wishes":["...","...","..."]}`,
      }

      const userPrompt = userPromptMap[type] || userPromptMap['invitation_message']

      const aiResult = await AiService.call(systemPrompt, userPrompt)

      let parsed: unknown
      try {
        parsed = AiService.parseJsonResponse(aiResult.content)
      } catch {
        parsed = { main_text: aiResult.content, alternatives: [] }
      }

      const newBalance = await deductCredit(req.user!.id)

      return res.json(success({ result: parsed, credits_remaining: newBalance }))
    } catch (err) {
      next(err)
    }
  },

  async generateTheme(req: Request, res: Response, next: NextFunction) {
    try {
      const { category = 'wedding', style_keywords = [] } = req.body as {
        category?: string
        style_keywords?: string[]
      }

      const systemPrompt = `Bạn là designer chuyên thiệp mời cho người Việt Nam.
Output: JSON thuần túy, không có markdown, không có giải thích.`

      const userPrompt = `Gợi ý bảng màu và font cho thiệp ${category === 'wedding' ? 'cưới' : 'sinh nhật'}.
Keywords: ${style_keywords.join(', ')}.
Output format:
{"primary_color":"#hex","secondary_color":"#hex","background_color":"#hex","text_color":"#hex","accent_color":"#hex","font_heading":"Google Font name","font_body":"Google Font name","mood":"mô tả","reasoning":"lý do"}`

      const aiResult = await AiService.call(systemPrompt, userPrompt)

      let parsed: unknown
      try {
        parsed = AiService.parseJsonResponse(aiResult.content)
      } catch {
        parsed = {}
      }

      const newBalance = await deductCredit(req.user!.id)

      return res.json(success({ result: parsed, credits_remaining: newBalance }))
    } catch (err) {
      next(err)
    }
  },
}
