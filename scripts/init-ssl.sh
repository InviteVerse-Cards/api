#!/bin/bash
# ════════════════════════════════════════════════════════════
#  Fengshui Platform — SSL Initialization Script
#  Chạy 1 lần duy nhất khi deploy lên VPS mới
#  Usage: ./scripts/init-ssl.sh
# ════════════════════════════════════════════════════════════
set -e

# ── Load .env ────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌ Không tìm thấy file .env"
  echo "   Hãy copy: cp .env.prod.example .env  rồi điền thông tin"
  exit 1
fi

# Source .env để lấy biến
set -a
source .env
set +a

# ── Kiểm tra biến bắt buộc ───────────────────────────────────
: "${DOMAIN:?❌ Chưa set DOMAIN trong .env (vd: DOMAIN=api.yourdomain.com)}"
: "${CERTBOT_EMAIL:?❌ Chưa set CERTBOT_EMAIL trong .env (vd: CERTBOT_EMAIL=you@gmail.com)}"

STAGING="${CERTBOT_STAGING:-0}"

echo ""
echo "════════════════════════════════════════════"
echo " 🔒 SSL Setup cho domain: $DOMAIN"
echo " 📧 Email: $CERTBOT_EMAIL"
if [ "$STAGING" = "1" ]; then
  echo " ⚠️  STAGING MODE (cert test, không hợp lệ thật)"
fi
echo "════════════════════════════════════════════"
echo ""

# ── Step 1: Tạo thư mục cần thiết ───────────────────────────
echo "📁 Tạo thư mục..."
mkdir -p ./nginx/conf.d
mkdir -p ./nginx/certbot/conf
mkdir -p ./nginx/certbot/www
mkdir -p ./logs

# ── Step 2: Download TLS params của certbot ──────────────────
if [ ! -f "./nginx/certbot/conf/options-ssl-nginx.conf" ]; then
  echo "⬇️  Tải nginx SSL options từ certbot..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o ./nginx/certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "./nginx/certbot/conf/ssl-dhparams.pem" ]; then
  echo "⬇️  Tải DH params (có thể mất vài giây)..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o ./nginx/certbot/conf/ssl-dhparams.pem
fi

# ── Step 3: Viết HTTP-only nginx config ─────────────────────
echo "📝 Tạo config nginx HTTP (tạm thời)..."
sed "s/YOUR_DOMAIN/$DOMAIN/g" ./nginx/templates/api.http.conf > ./nginx/conf.d/api.conf

# ── Step 4: Khởi động services ───────────────────────────────
echo "🚀 Khởi động nginx, api, mysql..."
docker compose -f docker-compose.prod.yml up -d --build nginx api mysql

echo "⏳ Chờ services sẵn sàng (15s)..."
sleep 15

# ── Step 5: Lấy SSL certificate ─────────────────────────────
echo "🔐 Đang xin cert từ Let's Encrypt..."

STAGING_FLAG=""
[ "$STAGING" = "1" ] && STAGING_FLAG="--staging"

docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING_FLAG \
  -d "$DOMAIN"

# ── Step 6: Switch sang HTTPS config ────────────────────────
echo "📝 Áp dụng config HTTPS..."
sed "s/YOUR_DOMAIN/$DOMAIN/g" ./nginx/templates/api.conf > ./nginx/conf.d/api.conf

# ── Step 7: Reload nginx với HTTPS ──────────────────────────
echo "🔄 Reload nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# ── Step 8: Khởi động certbot auto-renewal ──────────────────
docker compose -f docker-compose.prod.yml up -d certbot

echo ""
echo "════════════════════════════════════════════"
echo " ✅ Hoàn tất! API đang chạy tại:"
echo "    https://$DOMAIN"
echo "    https://$DOMAIN/health"
echo ""
echo " 🔄 Cert tự động gia hạn mỗi 12 giờ"
echo "    (certbot service chạy nền)"
echo "════════════════════════════════════════════"
echo ""
