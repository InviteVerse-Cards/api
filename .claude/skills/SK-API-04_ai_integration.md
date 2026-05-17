# [SK-API-04] AI Integration (Claude API)

> Trigger: Viết bất kỳ tính năng AI generate (text, theme, full invitation).

---

## Claude Client Setup

```typescript
// config/claude.ts
import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default claude
```

---

## Model Selection Strategy

| Task | Model | MaxTokens | Cost |
|---|---|---|---|
| Generate text (greeting, message) | `claude-haiku-4-5-20251001` | 500 | Thấp |
| Generate theme config | `claude-haiku-4-5-20251001` | 300 | Thấp |
| Generate full invitation | `claude-sonnet-4-6` | 2000 | Cao |

**Rule:** Dùng Haiku cho tasks đơn giản, Sonnet cho full generation có nhiều reasoning.

---

## AI Service Pattern

```typescript
// modules/ai/ai.service.ts
import claude from '@/config/claude'
import { AppError } from '@/shared/errors/AppError'
import { CreditsService } from '@/modules/credits/credits.service'
import { AIGenerationRepository } from './ai.repository'

export const AIService = {
  async generateText(userId: number, invitationId: number | null, input: GenerateTextInput) {
    const CREDIT_COST = 1

    // 1. Debit sẽ xảy ra SAU — lưu generation record trước
    const generationId = await AIGenerationRepository.create({
      userId, invitationId,
      type: 'text',
      promptInput: JSON.stringify(input),
      creditsUsed: CREDIT_COST,
      status: 'pending',
      model: 'claude-haiku-4-5-20251001',
    })

    try {
      // 2. Build prompt
      const prompt = buildTextPrompt(input)

      // 3. Call Claude API
      const response = await callClaudeWithRetry(
        'claude-haiku-4-5-20251001',
        prompt,
        500
      )

      // 4. Parse response
      const parsed = parseJSONResponse(response, TEXT_FALLBACK[input.type])

      // 5. Deduct credits SAU KHI thành công
      const newBalance = await CreditsService.deduct(userId, CREDIT_COST, 'spend_ai', generationId)

      // 6. Update generation record
      await AIGenerationRepository.updateSuccess(generationId, response, parsed)

      return { ...parsed, credits_remaining: newBalance }
    } catch (err) {
      await AIGenerationRepository.updateFailed(generationId, String(err))
      // KHÔNG deduct credits nếu failed
      throw err
    }
  },
}
```

---

## Claude API Call với Retry

```typescript
async function callClaudeWithRetry(
  model: string,
  prompt: string,
  maxTokens: number,
  retries = 1,
): Promise<string> {
  try {
    const response = await claude.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')
    return content.text
  } catch (err: unknown) {
    if (retries > 0 && isRetryableError(err)) {
      await sleep(1000)
      return callClaudeWithRetry(model, prompt, maxTokens, retries - 1)
    }
    throw new AppError('AI_FAILED', 'Không thể tạo nội dung AI lúc này, thử lại sau', 503)
  }
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Anthropic.RateLimitError) return true
  if (err instanceof Anthropic.InternalServerError) return true
  return false
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

## JSON Response Parser

```typescript
function parseJSONResponse<T>(raw: string, fallback: T): T {
  // Extract JSON từ response (Claude có thể bọc trong markdown)
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return fallback

  try {
    return JSON.parse(jsonMatch[0]) as T
  } catch {
    return fallback
  }
}

// Fallback values
const TEXT_FALLBACK = {
  invitation_message: {
    main_text: 'Trân trọng kính mời Quý khách đến dự buổi lễ của chúng tôi.',
    alternatives: [],
  },
  greeting: { text: 'Trọn đời bên nhau', alternatives: [] },
  wishes: { wishes: ['Chúc mừng!', 'Hạnh phúc mãi mãi!'] },
}
```

---

## Prompt Templates

```typescript
// modules/ai/prompts/textGeneration.ts
export function buildTextPrompt(input: GenerateTextInput): string {
  const categoryLabel = input.category === 'wedding' ? 'đám cưới' : 'sinh nhật'

  const base = `Bạn là chuyên gia viết lời mời và thiệp chúc mừng cho người Việt Nam.
Viết theo phong cách: ${input.tone || 'lịch sự, ấm áp'}.
Ngôn ngữ: Tiếng Việt.
Output: JSON thuần túy, không có markdown, không có giải thích.`

  const prompts: Record<string, string> = {
    invitation_message: `
${base}
Viết lời mời cho thiệp ${categoryLabel}.
Thông tin: ${JSON.stringify(input.context)}
Output format: {"main_text":"...","alternatives":["...","..."]}`,

    greeting: `
${base}
Viết tagline ngắn (dưới 20 chữ) cho thiệp ${categoryLabel}.
Phong cách: ${input.tone}
Output format: {"text":"...","alternatives":["...","..."]}`,

    wishes: `
${base}
Viết 3 lời chúc cho thiệp ${categoryLabel}.
Output format: {"wishes":["...","...","..."]}`,
  }

  return prompts[input.type] || prompts['invitation_message']
}

// modules/ai/prompts/themeGeneration.ts
export function buildThemePrompt(input: GenerateThemeInput): string {
  return `Bạn là designer chuyên thiệp mời cho người Việt Nam.
Gợi ý bảng màu và font cho thiệp ${input.category}.
Keywords: ${input.style_keywords.join(', ')}.
Output JSON thuần túy:
{
  "primary_color":"#hex",
  "secondary_color":"#hex",
  "background_color":"#hex",
  "text_color":"#hex",
  "accent_color":"#hex",
  "font_heading":"Google Font name",
  "font_body":"Google Font name",
  "mood":"mô tả",
  "reasoning":"lý do chọn"
}`
}
```

---

## Input Sanitization (chống Prompt Injection)

```typescript
function sanitizeAIInput(input: string): string {
  return input
    .slice(0, 500)                           // Giới hạn độ dài
    .replace(/[<>{}[\]\\`]/g, '')            // Loại bỏ chars nguy hiểm
    .replace(/ignore|forget|pretend|system/gi, '')  // Loại bỏ injection keywords
    .trim()
}
```

---

## AI Controller Pattern

```typescript
// modules/ai/ai.controller.ts
export const AIController = {
  generateText: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // requireCredits middleware đã check ở route level
      const result = await AIService.generateText(
        req.user!.id,
        req.body.invitation_id || null,
        {
          type: req.body.type,
          category: req.body.context.category,
          tone: req.body.context.tone,
          context: req.body.context,
        }
      )
      return res.json(success(result))
    } catch (err) {
      next(err)
    }
  },
}

// Route:
router.post('/generate-text',
  aiLimiter,
  verifyToken,
  requireCredits(1),        // kiểm tra trước khi gọi
  validate(generateTextSchema),
  AIController.generateText
)
```

---

## AI Generation DB Record

```typescript
// Luôn lưu AI generation để:
// 1. Audit trail (dùng credit gì)
// 2. Refund khi AI fail
// 3. Analytics

interface AIGenerationCreate {
  userId: number
  invitationId: number | null
  type: 'text' | 'theme' | 'full_config'
  promptInput: string
  creditsUsed: number
  status: 'pending' | 'success' | 'failed'
  model: string
}
```

---

## Cost Optimization Rules

1. **Haiku cho tasks đơn giản** — text generate, theme generate
2. **Sonnet chỉ cho full_config** — phức tạp hơn, cần reasoning
3. **maxTokens phải đặt cụ thể** — không để default
4. **Không call AI trong loop** — nếu cần batch, xử lý sequential với delay
5. **Log mọi AI request** — để track cost và debug
