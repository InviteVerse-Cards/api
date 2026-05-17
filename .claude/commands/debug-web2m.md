# debug-web2m

## Mục đích
Debug các vấn đề liên quan đến thanh toán Web2M QR. Hướng dẫn kiểm tra từng bước: DB state, topup_code format, Web2M API response, polling logic, và credit deduction — với các failure scenarios phổ biến.

## Cách dùng
`/debug-web2m [order_id|user_id]`

Ví dụ:
- `/debug-web2m` — debug tổng quát
- `/debug-web2m order:456` — debug order cụ thể
- `/debug-web2m user:123` — debug tất cả orders của user

## Các bước thực hiện

### Bước 1 — Kiểm tra credit_orders trong DB

```sql
-- Xem tất cả pending orders (cần chú ý nhất):
SELECT
  co.id,
  co.user_id,
  co.package_id,
  co.credits,
  co.amount,
  co.topup_code,
  co.status,
  co.retry_count,
  co.qr_expires_at,
  co.paid_at,
  co.web2m_transaction_id,
  co.created_at,
  u.email,
  u.credits_balance,
  u.credits_expires_at
FROM credit_orders co
JOIN users u ON u.id = co.user_id
WHERE co.status = 'pending'
ORDER BY co.created_at DESC
LIMIT 20;

-- Kiểm tra order cụ thể theo order_id:
SELECT co.*, u.email, u.credits_balance
FROM credit_orders co
JOIN users u ON u.id = co.user_id
WHERE co.id = <ORDER_ID>;

-- Kiểm tra orders của một user:
SELECT * FROM credit_orders
WHERE user_id = <USER_ID>
ORDER BY created_at DESC
LIMIT 10;
```

**Phân tích kết quả:**
- `status = 'pending'` → Order chưa được xác nhận
- `retry_count` cao → Polling đang chạy nhưng chưa khớp
- `qr_expires_at < NOW()` → QR đã hết hạn, cần tạo order mới
- `web2m_transaction_id IS NOT NULL` → Đã khớp thành công nhưng DB có thể chưa update credits

### Bước 2 — Kiểm tra topup_code format

```typescript
// Kiểm tra format của topup_code:
// Format hợp lệ: TOPUP{yyyyMMdd}{8+ alphanumeric}
// Ví dụ: TOPUP2026050982A1B2C3

const TOPUP_REGEX = /TOPUP(\d{8})([A-Za-z0-9]{8,})/i

// Test trong Node.js REPL hoặc ts-node:
const code = 'TOPUP2026050982A1B2C3'
const match = code.match(TOPUP_REGEX)
console.log(match) // ['TOPUP2026050982A1B2C3', '20260509', '82A1B2C3']
```

Kiểm tra trong DB xem `topup_code` có đúng format không:
```sql
SELECT id, topup_code,
  -- Kiểm tra regex match trong MySQL:
  topup_code REGEXP '^TOPUP[0-9]{8}[A-Za-z0-9]{8,}$' AS is_valid_format
FROM credit_orders
WHERE status = 'pending';
```

**Vấn đề thường gặp với topup_code:**
- Code quá ngắn (< 16 chars total)
- Có ký tự đặc biệt không được phép
- Không bắt đầu bằng `TOPUP` (case-sensitive khi user tự nhập vào ngân hàng)
- User nhập sai code vào nội dung chuyển khoản → không match được

### Bước 3 — Kiểm tra Web2M API response trực tiếp

```typescript
// Test Web2M API trong ts-node / một script riêng:
import axios from 'axios'

const BANK_TOKEN = process.env.BANK_TOKEN  // từ .env
const API_URL    = process.env.API_GET_TRANSACTION_V2

async function testWeb2MAPI() {
  const url = `${API_URL}/${BANK_TOKEN}`
  console.log('Calling:', url)

  const { data } = await axios.get(url, { timeout: 15000 })
  console.log('Response status:', data.success)
  console.log('Transaction count:', data.transactions?.length)

  if (data.transactions) {
    // Xem 5 giao dịch gần nhất:
    const recent = data.transactions.slice(0, 5)
    recent.forEach((tx: any) => {
      console.log({
        id:          tx.transactionID,
        amount:      tx.amount,
        type:        tx.type,
        date:        tx.postingDate,
        description: tx.description?.substring(0, 100),
      })
    })
  }
}

testWeb2MAPI().catch(console.error)
```

**Phân tích response:**
- `data.success === false` → Token không hợp lệ hoặc API đang lỗi
- `data.transactions` rỗng → Không có giao dịch mới / token sai
- Transaction có type `+` (PLUS_MONEY) → Tiền vào (mới check)
- Transaction có type `-` (MINUS_MONEY) → Tiền ra (bỏ qua)

### Bước 4 — So khớp transaction thủ công

```typescript
// Script debug — tìm match cho một order cụ thể:
import { pool } from '@/config/database'
import axios from 'axios'

const ORDER_ID = <ORDER_ID>  // điền order cần check

async function debugPaymentMatch() {
  // 1. Lấy order từ DB
  const [orders] = await pool.execute(
    'SELECT * FROM credit_orders WHERE id = ?',
    [ORDER_ID]
  )
  const order = (orders as any[])[0]
  if (!order) { console.error('Order not found'); return }

  console.log('Order:', {
    id:         order.id,
    topup_code: order.topup_code,
    amount:     order.amount,
    status:     order.status,
    created_at: order.created_at,
  })

  // 2. Lấy transaction history từ Web2M
  const url   = `${process.env.API_GET_TRANSACTION_V2}/${process.env.BANK_TOKEN}`
  const { data } = await axios.get(url)
  const transactions = (data.transactions ?? []).filter((t: any) => t.type === '+')

  console.log(`Found ${transactions.length} incoming transactions`)

  // 3. So khớp từng transaction
  const TOPUP_REGEX = /TOPUP(\d{8})([A-Za-z0-9]{8,})/i
  for (const tx of transactions) {
    const match = tx.description?.match(TOPUP_REGEX)
    if (!match) continue
    const txCode = `TOPUP${match[1]}${match[2]}`

    const isCodeMatch   = order.topup_code.toUpperCase() === txCode.toUpperCase()
    const isAmountMatch = Math.abs(Number(tx.amount) - Number(order.amount)) < 1

    if (isCodeMatch || isAmountMatch) {
      console.log('POTENTIAL MATCH:', {
        tx_code:       txCode,
        order_code:    order.topup_code,
        code_match:    isCodeMatch,
        tx_amount:     tx.amount,
        order_amount:  order.amount,
        amount_match:  isAmountMatch,
        tx_date:       tx.postingDate,
        tx_id:         tx.transactionID,
      })
    }
  }
}

debugPaymentMatch()
```

### Bước 5 — Kích hoạt checkPayment thủ công

Nếu polling background đã stop (server restart, process kill) hoặc cần trigger ngay:

```typescript
// Trong ts-node hoặc thêm một admin endpoint:
import { Web2MService } from '@/services/web2m.service'

// Trigger check cho order cụ thể:
const success = await Web2MService.checkPayment(ORDER_ID)
console.log('Payment check result:', success)
```

Hoặc tạo admin endpoint tạm thời:
```typescript
// Route admin tạm thời để trigger check (XÓA SAU KHI DEBUG):
router.post('/admin/debug/check-payment/:orderId',
  verifyToken, requireRole('admin'),
  async (req, res) => {
    const orderId = Number(req.params.orderId)
    const result  = await Web2MService.checkPayment(orderId)
    res.json({ success: true, data: { payment_matched: result } })
  }
)
```

### Bước 6 — Kiểm tra UserModel.addCredits

```sql
-- Kiểm tra xem credits đã được cộng chưa:
SELECT
  id,
  email,
  credits_balance,
  credits_expires_at,
  updated_at
FROM users
WHERE id = <USER_ID>;

-- Xem credit_usage_log nếu có (chỉ khi trừ credit, KHÔNG khi cộng):
SELECT * FROM credit_usage_log
WHERE user_id = <USER_ID>
ORDER BY created_at DESC
LIMIT 5;

-- Xem lịch sử credit_orders của user:
SELECT id, credits, amount, topup_code, status, paid_at, created_at
FROM credit_orders
WHERE user_id = <USER_ID>
ORDER BY created_at DESC;
```

Nếu order `status = 'paid'` nhưng `credits_balance` chưa tăng:
```sql
-- Manual fix (sau khi đã xác nhận transaction thực sự đã khớp):
BEGIN;

UPDATE credit_orders
SET status = 'paid',
    web2m_transaction_id = '<TX_ID>',
    paid_at = NOW(),
    updated_at = NOW()
WHERE id = <ORDER_ID> AND status = 'pending';

UPDATE users
SET credits_balance    = credits_balance + <CREDITS>,
    credits_expires_at = DATE_ADD(NOW(), INTERVAL 50 DAY),
    updated_at         = NOW()
WHERE id = <USER_ID>;

COMMIT;
```

## Failure Scenarios phổ biến

### Scenario 1: User chuyển khoản đúng nhưng hệ thống không nhận
**Nguyên nhân có thể:**
1. `topup_code` trong nội dung CK bị sai (user tự nhập thay vì copy)
2. Số tiền chuyển khoản sai (không khớp với `order.amount`)
3. Web2M API token hết hạn hoặc bị revoke
4. `postingDate` format thay đổi từ phía Web2M → parse date sai
5. Background polling bị stop (server restart, crash)

**Debug steps:**
1. Xem `credit_orders.retry_count` — nếu = 0 thì polling chưa chạy lần nào
2. Gọi Web2M API trực tiếp (Bước 3) → xem transaction có trong danh sách không
3. So sánh `description` của transaction với `topup_code` trong DB (Bước 4)
4. Kiểm tra logs server cho `[PAYMENT POLL ERROR]`

### Scenario 2: `status = 'expired'` nhưng user đã chuyển khoản
**Nguyên nhân:**
- QR đã hết hạn 30 phút, polling đã stop và mark expired
- Tuy nhiên transaction VẪN có thể đến sau deadline

**Xử lý:**
```sql
-- Reset status để cho phép check lại (nếu trong 24h):
UPDATE credit_orders
SET status = 'pending',
    retry_count = 0,
    qr_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE),
    updated_at = NOW()
WHERE id = <ORDER_ID>;
```
Sau đó trigger `Web2MService.schedulePolling(orderId)`.

### Scenario 3: Web2M API trả về `success: false`
**Kiểm tra:**
```bash
# Test token trực tiếp:
curl "https://api.web2m.com/historyapi/<BANK_TOKEN>"
```

**Nguyên nhân thường gặp:**
- `BANK_TOKEN` trong `.env` sai hoặc hết hạn
- Web2M service đang bảo trì
- IP server bị block bởi Web2M
- Rate limiting từ Web2M API

**Fix:**
- Kiểm tra `process.env.BANK_TOKEN` đang được load đúng chưa
- Login vào dashboard Web2M để kiểm tra token status
- Liên hệ Web2M support nếu nghi ngờ IP block

### Scenario 4: Credits không được cộng sau khi payment confirmed
**Kiểm tra logic trong `Web2MService.checkPayment`:**
1. Xem logs: tìm `[PAYMENT OK]` — nếu có thì function đã chạy
2. Kiểm tra `UserModel.addCredits` được gọi đúng chưa:
   ```sql
   -- So sánh paid_at với credits updated_at:
   SELECT co.paid_at, u.updated_at, u.credits_balance
   FROM credit_orders co
   JOIN users u ON u.id = co.user_id
   WHERE co.id = <ORDER_ID>;
   ```
3. Nếu `paid_at` có nhưng `u.updated_at` chưa thay đổi → `addCredits` không được gọi

### Scenario 5: Duplicate payment (cộng credits 2 lần)
**Phòng ngừa:**
- `credit_orders.topup_code` có `UNIQUE KEY` → không thể tạo 2 orders cùng code
- `Web2MService.checkPayment` check `status = 'pending'` trước → nếu đã `paid` thì return false
- Không có race condition vì `setTimeout` là single-threaded trong Node.js

**Nếu xảy ra:**
```sql
-- Audit:
SELECT * FROM credit_orders WHERE web2m_transaction_id = '<TX_ID>';
-- Nếu có 2 orders cùng TX_ID → data anomaly, cần manual fix
```

### Scenario 6: `retry_count` đã đạt max nhưng payment thực tế đến sau
**Xử lý:**
- Admin reset order về `pending` (xem Scenario 2)
- Hoặc tạo admin endpoint `POST /admin/credit-orders/:id/force-check`

## Checklist sau khi hoàn thành

- [ ] `credit_orders.status` đang đúng với trạng thái thực tế
- [ ] `topup_code` trong DB khớp với nội dung user đã nhập khi chuyển khoản
- [ ] Web2M API call trả về `success: true` và có transactions
- [ ] Log server không có `[PAYMENT POLL ERROR]` liên tục
- [ ] `UserModel.addCredits` được gọi đúng sau khi match
- [ ] `users.credits_balance` và `users.credits_expires_at` đã được cập nhật
- [ ] Không có duplicate credits (check `credit_orders` có nhiều `paid` records không)
- [ ] `BANK_TOKEN` trong `.env` còn hợp lệ
