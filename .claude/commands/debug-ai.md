# debug-ai

## Mục đích
Debug các vấn đề với AI service (OpenAI / Anthropic / Gemini). Hướng dẫn kiểm tra: trạng thái model trong DB, decrypt và test API key, kiểm tra ai_prompts tồn tại cho đúng module+tier, theo dõi tokens và fallback chain.

## Cách dùng
`/debug-ai [module] [tier]`

Ví dụ:
- `/debug-ai` — debug tổng quát AI service
- `/debug-ai love paid` — debug module love tier paid
- `/debug-ai numerology free` — debug module numerology tier free

## Các bước thực hiện

### Bước 1 — Kiểm tra ai_models trong DB

```sql
-- Xem tất cả models và trạng thái:
SELECT
  id,
  name,
  provider,
  model_id,
  is_active,
  is_default,
  priority,
  max_tokens,
  temperature,
  total_tokens,
  cost_per_1k,
  -- KHÔNG SELECT api_key_enc ra đây (nhạy cảm)
  created_at,
  updated_at
FROM ai_models
ORDER BY is_default DESC, priority ASC;

-- Kiểm tra model nào đang active:
SELECT id, name, provider, model_id, is_default, priority
FROM ai_models
WHERE is_active = 1
ORDER BY is_default DESC, priority ASC;
```

**Phân tích:**
- Không có model nào `is_active = 1` → AI service sẽ throw "Không có AI model nào khả dụng"
- Không có model nào `is_default = 1` → Dùng model `priority` thấp nhất (thấp hơn = ưu tiên hơn)
- Tất cả models `is_active = 0` → AI service hoàn toàn bị tắt
- `total_tokens` quá cao → Có thể đang bị spam hoặc cost quá cao

### Bước 2 — Kiểm tra và decrypt API key

```typescript
// src/utils/crypto.ts đã có hàm decrypt — test trong ts-node:
import { decrypt } from './src/utils/crypto'
import { pool } from './src/config/database'
import { RowDataPacket } from 'mysql2/promise'

async function testDecryptApiKey(modelId: number) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, name, provider, model_id, api_key_enc FROM ai_models WHERE id = ?',
    [modelId]
  )

  if (!rows.length) {
    console.error('Model not found')
    return
  }

  const model = rows[0] as {
    id: number
    name: string
    provider: string
    model_id: string
    api_key_enc: string
  }

  console.log('Model:', model.name, '/', model.provider, '/', model.model_id)

  try {
    const apiKey = decrypt(model.api_key_enc)
    // Chỉ in vài ký tự đầu/cuối để verify (không in full key)
    const masked = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
    console.log('API Key (masked):', masked)
    console.log('Key length:', apiKey.length)

    // Validate format theo provider:
    if (model.provider === 'openai') {
      console.log('Format valid:', apiKey.startsWith('sk-'))
    } else if (model.provider === 'anthropic') {
      console.log('Format valid:', apiKey.startsWith('sk-ant-'))
    } else if (model.provider === 'google') {
      console.log('Format valid:', apiKey.length > 20) // Google API keys khác nhau
    }
  } catch (err) {
    console.error('DECRYPT FAILED:', err)
    console.log('Có thể do: ENCRYPTION_KEY trong .env bị thay đổi, hoặc api_key_enc bị corrupt')
  }
}

testDecryptApiKey(1)  // test model ID 1
```

**Kiểm tra ENCRYPTION_KEY:**
```bash
# .env phải có:
ENCRYPTION_KEY=<32-byte hex key>  # dùng: openssl rand -hex 32

# Kiểm tra length:
echo -n "$ENCRYPTION_KEY" | wc -c  # phải là 64 (32 bytes hex)
```

### Bước 3 — Test API key trực tiếp với provider

```typescript
// Test OpenAI:
import OpenAI from 'openai'

async function testOpenAI(apiKey: string, modelId: string) {
  const client = new OpenAI({ apiKey })
  try {
    const res = await client.chat.completions.create({
      model: modelId,           // ví dụ: 'gpt-4o', 'gpt-4o-mini'
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Say "API key works" in JSON: {"status": "ok"}' },
      ],
      max_tokens: 50,
      response_format: { type: 'json_object' },
    })
    console.log('OpenAI OK:', res.choices[0].message.content)
    console.log('Tokens used:', res.usage?.total_tokens)
  } catch (err: any) {
    console.error('OpenAI ERROR:', err.status, err.message)
    // Lỗi thường gặp:
    // 401 → API key sai hoặc hết hạn
    // 429 → Rate limit / quota hết
    // 404 → model_id không tồn tại
    // 500 → OpenAI đang lỗi
  }
}

// Test Anthropic:
import Anthropic from '@anthropic-ai/sdk'

async function testAnthropic(apiKey: string, modelId: string) {
  const client = new Anthropic({ apiKey })
  try {
    const res = await client.messages.create({
      model: modelId,           // ví dụ: 'claude-3-5-sonnet-20241022'
      max_tokens: 50,
      system: 'You are helpful.',
      messages: [{ role: 'user', content: 'Say OK in JSON: {"status": "ok"}' }],
    })
    const block = res.content[0]
    console.log('Anthropic OK:', block.type === 'text' ? block.text : '(non-text)')
    console.log('Tokens used:', res.usage.input_tokens + res.usage.output_tokens)
  } catch (err: any) {
    console.error('Anthropic ERROR:', err.status, err.message)
    // 401 → key sai
    // 429 → rate limit
    // 529 → overloaded
  }
}
```

### Bước 4 — Kiểm tra ai_prompts cho module+tier combo

```sql
-- Xem tất cả prompts hiện có:
SELECT
  id,
  module,
  tier,
  version,
  is_active,
  created_at,
  LEFT(system_prompt, 100) AS system_prompt_preview,
  LEFT(user_template, 100) AS user_template_preview
FROM ai_prompts
ORDER BY module, tier, version DESC;

-- Kiểm tra prompt cho module+tier cụ thể:
SELECT id, module, tier, version, is_active
FROM ai_prompts
WHERE module = '<module>'
  AND tier   = '<tier>'
  AND is_active = 1
ORDER BY version DESC;

-- Kiểm tra {{placeholder}} trong template:
SELECT id, module, tier,
  user_template LIKE '%{{full_name}}%'  AS has_full_name,
  user_template LIKE '%{{birth_date}}%' AS has_birth_date
FROM ai_prompts
WHERE is_active = 1;
```

**Vấn đề thường gặp:**
- Không có prompt nào với `is_active = 1` cho module+tier → `AIService.call()` throw "Không tìm thấy prompt"
- `{{placeholder}}` sai tên (ví dụ `{{birthDate}}` thay vì `{{birth_date}}`) → AI nhận giá trị rỗng
- Template yêu cầu JSON nhưng system_prompt không đề cập → AI trả text thay vì JSON → parse fail

### Bước 5 — Kiểm tra fallback chain

```typescript
// Simulate AIService.call() fallback chain:
import { pool } from '@/config/database'
import { RowDataPacket } from 'mysql2/promise'
import { decrypt } from '@/utils/crypto'

async function debugFallbackChain() {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, name, provider, model_id, priority, is_default FROM ai_models WHERE is_active = 1 ORDER BY is_default DESC, priority ASC'
  )

  console.log('Active models (fallback order):')
  ;(rows as any[]).forEach((m, i) => {
    console.log(`  ${i + 1}. [${m.provider}] ${m.name} (${m.model_id}) — priority=${m.priority}, default=${m.is_default}`)
  })

  if (rows.length === 0) {
    console.error('NO ACTIVE MODELS — AI service sẽ throw error ngay lập tức!')
  }
}

debugFallbackChain()
```

Fallback logic trong `AIService.call()`:
```
models = [model1, model2, model3]  // sorted by is_default DESC, priority ASC
for each model:
  try:
    decrypt api_key → gọi provider API
    nếu thành công → trả về kết quả
  catch:
    log error → thử model tiếp theo
nếu tất cả fail → throw "Tất cả AI model đều thất bại"
```

### Bước 6 — Kiểm tra token usage và cost

```sql
-- Xem total_tokens của từng model:
SELECT
  id,
  name,
  provider,
  model_id,
  total_tokens,
  cost_per_1k,
  ROUND(total_tokens / 1000 * cost_per_1k, 4) AS estimated_cost_usd
FROM ai_models
ORDER BY total_tokens DESC;

-- Xem tokens theo thời gian (từ readings table):
SELECT
  DATE(r.created_at) AS date,
  r.module,
  m.name AS ai_model,
  COUNT(*) AS reading_count,
  SUM(r.tokens_used) AS total_tokens
FROM readings r
JOIN ai_models m ON m.id = r.ai_model_id
WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(r.created_at), r.module, m.name
ORDER BY date DESC, total_tokens DESC;

-- Phát hiện readings có tokens_used = 0 (có thể là bug):
SELECT id, module, tokens_used, ai_model_id, created_at
FROM readings
WHERE tokens_used = 0 AND is_free = 0
ORDER BY created_at DESC
LIMIT 20;
```

### Bước 7 — Kiểm tra logs

Tìm trong Winston logs (file hoặc console):
```bash
# Tìm AI errors trong logs:
grep -i "\[AI\]\|ai.service\|INTERNAL_ERROR\|AI model" logs/error.log | tail -50

# Tìm cụ thể module:
grep -i "love\|finance\|horoscope" logs/combined.log | grep -i "error" | tail -20
```

Các log patterns cần chú ý:
```
[ERROR] Model GPT-4o failed: 429 Too Many Requests
[ERROR] Tất cả AI model đều thất bại
[ERROR] AI trả về dữ liệu không hợp lệ JSON
[WARN] Model claude-3-5-sonnet failed: 529 Overloaded
```

## Failure Scenarios phổ biến

### Scenario 1: "Không có AI model nào khả dụng"
```sql
-- Fix: activate một model
UPDATE ai_models SET is_active = 1, is_default = 1 WHERE id = <MODEL_ID>;
```
Nguyên nhân: Admin đã deactivate tất cả models trong panel.

### Scenario 2: "Không tìm thấy prompt cho <module>/<tier>"
```sql
-- Kiểm tra:
SELECT * FROM ai_prompts WHERE module = '<module>' AND tier = '<tier>';

-- Fix: insert prompt mới hoặc kích hoạt prompt cũ
UPDATE ai_prompts SET is_active = 1 WHERE module = '<module>' AND tier = '<tier>';
-- Hoặc insert mới (xem add-reading-module.md)
```

### Scenario 3: API key decrypt lỗi
**Nguyên nhân:** `ENCRYPTION_KEY` trong `.env` bị thay đổi sau khi đã mã hoá key.
**Fix:** 
1. Lấy API key gốc từ provider dashboard
2. Mã hoá lại với `ENCRYPTION_KEY` hiện tại:
```typescript
import { encrypt } from '@/utils/crypto'
const newEncrypted = encrypt('<raw_api_key>')
// Update vào DB:
await pool.execute('UPDATE ai_models SET api_key_enc = ? WHERE id = ?', [newEncrypted, modelId])
```

### Scenario 4: AI trả về text thay vì JSON
**Nguyên nhân:** System prompt không yêu cầu rõ ràng JSON output, hoặc model không hỗ trợ `response_format: json_object`.
**Fix:**
1. Cập nhật system_prompt trong `ai_prompts`:
   - Thêm: "LUÔN trả về JSON hợp lệ. KHÔNG thêm text ngoài JSON block."
   - Thêm: "Format output bắt buộc: {...}"
2. Với OpenAI: đảm bảo dùng `response_format: { type: 'json_object' }`
3. Với Anthropic: thêm vào cuối system_prompt: "Output must be valid JSON only."

### Scenario 5: 429 Rate limit / Quota hết
**Dấu hiệu:** Logs hiện nhiều "429 Too Many Requests" hoặc "Rate limit exceeded".
**Fix:**
1. Kiểm tra quota còn lại trên provider dashboard
2. Thêm model backup (provider khác) với `priority` cao hơn (số nhỏ hơ = ưu tiên hơn)
3. Tạm thời set model bị rate limit `is_active = 0`
4. Tăng `temperature` retry delay trong AIService (nếu có)

### Scenario 6: Timeout 30s
**Dấu hiệu:** Readings fail sau đúng 30 giây.
**Fix:**
1. Giảm `max_tokens` của model trong DB
2. Rút gọn `user_template` prompt
3. Tăng timeout trong `AIService.callProvider()` (cẩn thận với user experience)
4. Bật model nhanh hơn (gpt-4o-mini, claude-haiku) làm fallback

### Scenario 7: JSON parse lỗi sau khi AI trả về
```typescript
// Debug: xem raw AI response
// Thêm tạm vào AIService.call():
logger.debug(`[AI_RAW_RESPONSE] ${aiResult.content.substring(0, 500)}`)
```
**Fix:**
- AI có thể trả về markdown code block: ` ```json {...} ``` `
- Strip markdown trước khi parse:
```typescript
const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
parsedResult = JSON.parse(cleaned)
```

## Checklist sau khi hoàn thành

- [ ] Ít nhất 1 model `is_active = 1` và `is_default = 1`
- [ ] `api_key_enc` decrypt thành công với ENCRYPTION_KEY hiện tại
- [ ] API key test thực tế với provider → trả về kết quả
- [ ] Có prompt cho module+tier combo cần debug với `is_active = 1`
- [ ] `{{placeholder}}` trong user_template khớp với userData keys trong AIService.call()
- [ ] Fallback chain hoạt động: model 2 thay thế khi model 1 fail
- [ ] `total_tokens` đang tăng đúng sau mỗi reading
- [ ] Không có "JSON parse error" trong logs gần đây
- [ ] `readings.ai_model_id` được ghi đúng sau khi AI thành công
