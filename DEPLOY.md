# Deploy API lên VPS — Hướng dẫn từng bước

> Stack: Docker + Nginx + Let's Encrypt (Certbot)  
> FE deploy riêng lên Vercel — không liên quan file này

---

## Yêu cầu VPS

- OS: Ubuntu 22.04 LTS (khuyến nghị)
- RAM: tối thiểu 1GB (2GB nếu MySQL cùng server)
- Docker + Docker Compose v2 đã cài
- Domain đã trỏ A record về IP của VPS

---

## Cấu trúc thư mục trên VPS

```
/opt/fengshui-api/          ← thư mục làm việc trên VPS
  Dockerfile
  docker-compose.prod.yml
  .env                       ← KHÔNG commit lên git
  .dockerignore
  src/
  ...
  nginx/
    templates/               ← template config (commit lên git)
      api.conf
      api.http.conf
    conf.d/                  ← config đang active (tự động tạo bởi init-ssl.sh)
    certbot/
      conf/                  ← cert letsencrypt (tự động tạo)
      www/                   ← webroot challenge (tự động tạo)
  scripts/
    init-ssl.sh
  logs/                      ← winston logs (tự động tạo)
```

---

## Bước 1 — Cài Docker trên VPS (nếu chưa có)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

---

## Bước 2 — Clone / Upload code lên VPS

```bash
# Cách 1: git clone (khuyến nghị)
git clone https://github.com/your-repo/fengshui-api.git /opt/fengshui-api
cd /opt/fengshui-api

# Cách 2: rsync từ máy local
rsync -avz --exclude node_modules --exclude dist --exclude .env \
  ./api/ user@your-vps-ip:/opt/fengshui-api/
```

---

## Bước 3 — Tạo file .env

```bash
cd /opt/fengshui-api
cp .env.prod.example .env
nano .env   # điền thông tin thật
```

**Các biến quan trọng phải điền:**
- `DOMAIN` — domain API của bạn (vd: `api.fengshui.vn`)
- `CERTBOT_EMAIL` — email nhận thông báo cert
- `FRONTEND_URL` — URL của Vercel app (để CORS hoạt động)
- `DB_PASSWORD` + `MYSQL_ROOT_PASSWORD` — mật khẩu DB
- `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` — tạo bằng lệnh bên dưới
- `ENCRYPTION_KEY` — tạo bằng lệnh bên dưới

```bash
# Tạo secret keys
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY
```

---

## Bước 4 — Trỏ DNS

Trong DNS manager của domain, thêm:
```
A record:  api.yourdomain.com  →  <IP_VPS>
```

Kiểm tra DNS đã resolve chưa:
```bash
nslookup api.yourdomain.com
# hoặc
dig api.yourdomain.com
```

---

## Bước 5 — Cấp quyền và chạy init SSL

```bash
cd /opt/fengshui-api
chmod +x scripts/init-ssl.sh

# Chạy script — tự động:
# 1. Tạo thư mục cần thiết
# 2. Download TLS params
# 3. Start nginx với HTTP config
# 4. Xin cert từ Let's Encrypt
# 5. Switch sang HTTPS config
# 6. Reload nginx
./scripts/init-ssl.sh
```

> ⚠️ **Test trước với STAGING mode**: set `CERTBOT_STAGING=1` trong .env,  
> chạy thành công rồi đổi về `CERTBOT_STAGING=0` và chạy lại.  
> Let's Encrypt giới hạn 5 cert thật/domain/tuần.

---

## Bước 6 — Kiểm tra

```bash
# Health check
curl https://api.yourdomain.com/health

# Logs API
docker compose -f docker-compose.prod.yml logs -f api

# Logs nginx
docker compose -f docker-compose.prod.yml logs -f nginx

# Kiểm tra tất cả services
docker compose -f docker-compose.prod.yml ps
```

---

## Deploy update (lần sau)

```bash
cd /opt/fengshui-api
git pull

# Rebuild và restart API (không ảnh hưởng nginx/certbot/mysql)
docker compose -f docker-compose.prod.yml up -d --build api

# Xem logs
docker compose -f docker-compose.prod.yml logs -f api
```

---

## Cấu hình Vercel FE

Trong Vercel dashboard → Settings → Environment Variables:
```
VITE_API_BASE_URL = https://api.yourdomain.com/api/v1
```

Đảm bảo `FRONTEND_URL` trong `.env` trên VPS khớp với URL Vercel:
```
FRONTEND_URL=https://your-app.vercel.app
# hoặc domain riêng:
FRONTEND_URL=https://fengshui.vn
```

> ⚠️ **Cookie SameSite**: Nếu FE và API khác domain (Vercel ≠ VPS domain),  
> cần đổi `sameSite: 'strict'` → `sameSite: 'none'` trong auth cookie  
> và đảm bảo `secure: true`. Xem ghi chú bên dưới.

---

## Lưu ý CORS & Cookie cross-domain

Nếu FE ở `https://fengshui.vn` và API ở `https://api.fengshui.vn`:

**`api/src/app.ts`** — CORS đã đúng (dùng `FRONTEND_URL`).

**`api/src/services/auth.service.ts`** — Cookie đã được cấu hình tự động:
- `NODE_ENV=production` → `sameSite: 'none'`, `secure: true` (cross-domain hoạt động)
- `NODE_ENV=development` → `sameSite: 'strict'`, `secure: false` (localhost hoạt động)

Không cần sửa code — chỉ cần set đúng `NODE_ENV=production` trong `.env`.

---

## Cert tự động gia hạn

Certbot service trong docker-compose tự động renew mỗi 12 giờ.  
Nginx reload mỗi 6 giờ để pick up cert mới.  
Cert Let's Encrypt hết hạn sau 90 ngày — renew tự động khi còn <30 ngày.

Kiểm tra cert hiện tại:
```bash
docker compose -f docker-compose.prod.yml run --rm certbot certificates
```

---

## Backup database

```bash
# Backup
docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p$MYSQL_ROOT_PASSWORD fengshui_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260510.sql | docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p$MYSQL_ROOT_PASSWORD fengshui_db
```

---

## Firewall (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (cần cho certbot challenge)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

Port 3000 (API) và 3306 (MySQL) **không expose** ra ngoài — chỉ internal Docker network.
