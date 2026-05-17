# [SK-API-05] Payment & Credits (Web2m)

> Trigger: Viết payment flow, credit system, webhook handling.

---

## Credit Packages (seed data)

```typescript
const PACKAGES = {
  starter:  { credits: 10,  price_vnd: 29_000 },
  standard: { credits: 30,  price_vnd: 79_000 },
  premium:  { credits: 100, price_vnd: 199_000 },
} as const

type PackageId = keyof typeof PACKAGES
```

---

## Payment Creation Flow

```typescript
// modules/payments/payments.service.ts
export const PaymentService = {
  async createOrder(userId: number, packageId: PackageId) {
    const pkg = PACKAGES[packageId]
    if (!pkg) throw new AppError('INVALID_PACKAGE', 'Gói không tồn tại', 400)

    // Tạo UUID ngắn cho transfer description
    const shortId = nanoid(8).toUpperCase()
    const description = `INVITEVERSE-${shortId}`

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO payments (uuid, user_id, provider, amount_vnd, credits_granted, package_name, status, description)
       VALUES (UUID(), ?, 'web2m', ?, ?, ?, 'pending', ?)`,
      [userId, pkg.price_vnd, pkg.credits, packageId, description]
    )

    return {
      payment_id: result.insertId,
      description,
      amount_vnd: pkg.price_vnd,
      credits_to_receive: pkg.credits,
      bank_account: process.env.WEB2M_BANK_ACCOUNT,
      expires_in_minutes: 30,
    }
  },
}
```

---

## Webhook Handler (idempotent)

```typescript
// modules/payments/payments.controller.ts
export const PaymentController = {
  webhook: async (req: Request, res: Response, next: NextFunction) => {
    // 1. Webhook secret đã verify bởi middleware
    const { transaction_id, amount, description, bank, time } = req.body

    try {
      // 2. Tìm payment matching description
      const [rows] = await pool.query<PaymentRow[]>(
        `SELECT id, user_id, amount_vnd, credits_granted, status
         FROM payments
         WHERE description = ? AND provider = 'web2m'`,
        [description?.trim()]
      )
      const payment = rows[0]

      // 3. Không tìm thấy → log và trả 200 (web2m không retry)
      if (!payment) {
        logger.warn(`Webhook: payment not found for description "${description}"`)
        return res.json({ success: true })
      }

      // 4. Đã confirmed rồi → idempotent, bỏ qua
      if (payment.status === 'confirmed') {
        return res.json({ success: true })
      }

      // 5. Verify amount
      if (Number(amount) !== payment.amount_vnd) {
        await pool.query(
          `UPDATE payments SET status = 'failed', note = ? WHERE id = ?`,
          [`Amount mismatch: expected ${payment.amount_vnd}, got ${amount}`, payment.id]
        )
        return res.json({ success: true })
      }

      // 6. Cộng credits trong transaction
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()

        // Update payment
        await conn.query(
          `UPDATE payments SET status = 'confirmed', provider_tx_id = ?, confirmed_at = NOW(),
           raw_webhook = ? WHERE id = ?`,
          [transaction_id, JSON.stringify(req.body), payment.id]
        )

        // Cộng credits
        await conn.query(
          `UPDATE credits SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?`,
          [payment.credits_granted, payment.credits_granted, payment.user_id]
        )

        // Ghi ledger
        const [[{ newBalance }]] = await conn.query<Array<{ newBalance: number } & RowDataPacket>>(
          'SELECT balance as newBalance FROM credits WHERE user_id = ?',
          [payment.user_id]
        )
        await conn.query(
          `INSERT INTO credit_transactions (user_id, amount, balance_after, type, reference_id, reference_type, description)
           VALUES (?, ?, ?, 'purchase', ?, 'payment', ?)`,
          [payment.user_id, payment.credits_granted, newBalance, payment.id, `Mua gói ${payment.package_name}`]
        )

        await conn.commit()
        logger.info(`Payment confirmed: user ${payment.user_id} +${payment.credits_granted} credits`)
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }

      return res.json({ success: true })
    } catch (err) {
      logger.error('Webhook error:', err)
      // Vẫn trả 200 để web2m không retry loop — lỗi đã log
      return res.json({ success: true })
    }
  },
}
```

---

## Credits Service

```typescript
// modules/credits/credits.service.ts
export const CreditsService = {
  async getBalance(userId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT balance FROM credits WHERE user_id = ?',
      [userId]
    )
    return rows[0]?.balance ?? 0
  },

  async deduct(userId: number, amount: number, type: string, referenceId: number): Promise<number> {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      // Check và deduct atomically
      const [result] = await conn.query<ResultSetHeader>(
        `UPDATE credits SET balance = balance - ?, total_spent = total_spent + ?
         WHERE user_id = ? AND balance >= ?`,
        [amount, amount, userId, amount]
      )

      if (result.affectedRows === 0) {
        throw new AppError('CREDIT_INSUFFICIENT', 'Không đủ credits', 402)
      }

      // Get new balance
      const [[{ balance }]] = await conn.query<Array<{ balance: number } & RowDataPacket>>(
        'SELECT balance FROM credits WHERE user_id = ?',
        [userId]
      )

      // Ghi ledger
      await conn.query(
        `INSERT INTO credit_transactions (user_id, amount, balance_after, type, reference_id, reference_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, -amount, balance, type, referenceId, type.replace('spend_', '')]
      )

      await conn.commit()
      return balance
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async initForUser(userId: number): Promise<void> {
    await pool.query(
      `INSERT IGNORE INTO credits (user_id, balance, total_earned, total_spent) VALUES (?, 0, 0, 0)`,
      [userId]
    )
  },
}
```

---

## Payment Route Setup

```typescript
// modules/payments/payments.routes.ts
router.get('/packages', PaymentController.getPackages)          // No auth — public
router.post('/create', verifyToken, apiLimiter, validate(createPaymentSchema), PaymentController.create)
router.get('/history', verifyToken, PaymentController.history)

// Webhook — NO JWT auth, chỉ dùng webhook secret
router.post('/webhook', verifyWebhookSecret, PaymentController.webhook)

router.get('/credits/balance', verifyToken, PaymentController.getBalance)
```

---

## Anti-Fraud Rules

```typescript
// 1. Unique constraint trên provider_tx_id — DB level duplicate prevention
// migrations: ADD UNIQUE INDEX uniq_provider_tx (provider, provider_tx_id)

// 2. Amount phải khớp đúng package price
// 3. Description phải match format INVITEVERSE-XXXXXXXX
// 4. Payment timeout: cron job expire pending >30 phút

// Cleanup cron (chạy mỗi 5 phút):
async function expirePendingPayments() {
  await pool.query(
    `UPDATE payments SET status = 'failed', note = 'Timeout'
     WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
  )
}
```

---

## Credit Ledger Invariant

```
Mọi thay đổi credits PHẢI được ghi vào credit_transactions.
balance trong credits table = SUM(amount) FROM credit_transactions WHERE user_id = X

Không bao giờ update credits.balance trực tiếp mà không ghi ledger.
credits.balance là cache — ledger là source of truth.
```
