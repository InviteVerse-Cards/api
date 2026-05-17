import type { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { AIModelModel } from '@/models/aiModel.model'
import { encrypt } from '@/utils/crypto'
import { success, createError } from '@/utils/response'

// Anthropic doesn't expose a public model listing endpoint — hardcode latest models
const ANTHROPIC_MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
]

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const res = await axios.get('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const ids: string[] = (res.data?.data ?? []).map((m: { id: string }) => m.id)
  // Only keep chat-completion capable models
  return ids
    .filter(id => /^(gpt-|o[0-9]|chatgpt)/.test(id))
    .sort()
}

async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  const res = await axios.get(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )
  const models: Array<{ name: string; supportedGenerationMethods?: string[] }> =
    res.data?.models ?? []
  return models
    .filter(m => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map(m => m.name.replace('models/', ''))
    .sort()
}

export const AdminAIController = {
  async fetchModels(req: Request, res: Response, next: NextFunction) {
    try {
      const { provider, api_key } = req.body as { provider: string; api_key: string }

      if (!provider || !api_key) {
        return next(createError('MISSING_PARAMS', 'Thiếu provider hoặc api_key', 422))
      }

      let models: string[]
      if (provider === 'openai') {
        models = await fetchOpenAIModels(api_key)
      } else if (provider === 'anthropic') {
        models = ANTHROPIC_MODELS
      } else if (provider === 'gemini') {
        models = await fetchGeminiModels(api_key)
      } else {
        return next(createError('INVALID_PROVIDER', 'Provider không hợp lệ', 422))
      }

      return res.json(success({ models }))
    } catch (_err) {
      console.error('Error fetching models:', _err)
      // Wrap provider API errors with a friendly message
      return next(createError('FETCH_MODELS_FAILED', 'Không thể lấy danh sách model — kiểm tra lại API key', 400))
    }
  },

  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const models = await AIModelModel.findAll()
      // Mask api keys in response
      const safe = models.map(m => ({ ...m, api_key_encrypted: '***' }))
      return res.json(success(safe))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, provider, model_id, api_key, max_tokens, temperature, priority } = req.body as {
        name: string
        provider: 'openai' | 'anthropic' | 'gemini'
        model_id: string
        api_key: string
        max_tokens?: number
        temperature?: number
        priority?: number
      }

      if (!['openai', 'anthropic', 'gemini'].includes(provider)) {
        return next(createError('INVALID_PROVIDER', 'Provider phải là openai, anthropic hoặc gemini', 422))
      }

      const api_key_encrypted = encrypt(api_key)
      const id = await AIModelModel.create({ name, provider, model_id, api_key_encrypted, max_tokens, temperature, priority })
      const model = await AIModelModel.findById(id)
      return res.status(201).json(success({ ...model, api_key_encrypted: '***' }, 'Tạo AI model thành công'))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const model = await AIModelModel.findById(id)
      if (!model) return next(createError('NOT_FOUND', 'AI model không tồn tại', 404))

      const { name, provider, model_id, api_key, max_tokens, temperature, is_active, is_default, priority } = req.body as {
        name?: string
        provider?: 'openai' | 'anthropic' | 'gemini'
        model_id?: string
        api_key?: string
        max_tokens?: number
        temperature?: number
        is_active?: boolean | number
        is_default?: boolean | number
        priority?: number
      }

      const updates: Parameters<typeof AIModelModel.update>[1] = {}
      if (name !== undefined) updates.name = name
      if (provider !== undefined) updates.provider = provider
      if (model_id !== undefined) updates.model_id = model_id
      if (api_key) updates.api_key_encrypted = encrypt(api_key)
      if (max_tokens !== undefined) updates.max_tokens = Number(max_tokens)
      if (temperature !== undefined) updates.temperature = Number(temperature)
      if (is_active !== undefined) updates.is_active = Boolean(Number(is_active))
      if (priority !== undefined) updates.priority = Number(priority)

      await AIModelModel.update(id, updates)

      // Handle is_default separately — setDefault ensures only one model is default at a time
      if (is_default !== undefined && Number(is_default) === 1) {
        await AIModelModel.setDefault(id)
      }

      const updated = await AIModelModel.findById(id)
      return res.json(success({ ...updated, api_key_encrypted: '***' }, 'Cập nhật thành công'))
    } catch (err) { next(err) }
  },

  async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const model = await AIModelModel.findById(id)
      if (!model) return next(createError('NOT_FOUND', 'AI model không tồn tại', 404))

      await AIModelModel.setDefault(id)
      return res.json(success(null, `${model.name} đã được đặt làm model mặc định`))
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const model = await AIModelModel.findById(id)
      if (!model) return next(createError('NOT_FOUND', 'AI model không tồn tại', 404))

      await AIModelModel.delete(id)
      return res.json(success(null, 'Đã vô hiệu hóa AI model'))
    } catch (err) { next(err) }
  },

  async testKey(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const model = await AIModelModel.findById(id)
      if (!model) return next(createError('NOT_FOUND', 'AI model không tồn tại', 404))

      const { AiService } = await import('@/services/ai.service')
      const result = await AiService.call(
        'You are a helpful assistant.',
        'Say "ok" if you can hear me.',
        id
      )
      return res.json(success({ response: result.content, tokensUsed: result.tokensUsed }, 'API key hợp lệ'))
    } catch (err) { next(err) }
  },
}
