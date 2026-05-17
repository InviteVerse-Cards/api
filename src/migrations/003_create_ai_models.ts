import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name              VARCHAR(100)                        NOT NULL,
      provider          ENUM('openai','anthropic','gemini') NOT NULL,
      model_id          VARCHAR(100)                        NOT NULL,
      api_key_encrypted TEXT                                NOT NULL,
      max_tokens        INT UNSIGNED                        NOT NULL DEFAULT 4096,
      temperature       DECIMAL(3,2)                        NOT NULL DEFAULT 0.70,
      is_active         TINYINT(1)                          NOT NULL DEFAULT 1,
      is_default        TINYINT(1)                          NOT NULL DEFAULT 0,
      priority          INT                                 NOT NULL DEFAULT 10,
      total_tokens_used BIGINT                              NOT NULL DEFAULT 0,
      created_at        DATETIME                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_is_active  (is_active),
      INDEX idx_is_default (is_default),
      INDEX idx_priority   (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS ai_models')
}
