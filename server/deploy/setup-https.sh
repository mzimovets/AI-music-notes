#!/bin/bash
# Генерирует самоподписанный CA + сертификат сервера для raspberrypi-songs.local
# Запускать один раз: sudo bash setup-https.sh
#
# После запуска:
#   - Nginx слушает 443 (Next.js) и 4443 (Express/API)
#   - Сертификат CA доступен на https://raspberrypi-songs.local/cert
#   - Каждое устройство устанавливает CA один раз, потом всё работает автоматически

set -e

CERT_DIR="/etc/ssl/nevsky-songs"
HOSTNAME="raspberrypi-songs.local"
ORG="Nevsky Songs"

echo "🔐 Создаю директорию сертификатов..."
mkdir -p "$CERT_DIR"

echo "🔐 Генерирую CA (корневой сертификат)..."
openssl genrsa -out "$CERT_DIR/ca.key" 4096

openssl req -x509 -new -nodes \
  -key "$CERT_DIR/ca.key" \
  -sha256 -days 3650 \
  -out "$CERT_DIR/ca.crt" \
  -subj "/CN=$ORG CA/O=$ORG"

echo "🔐 Генерирую сертификат сервера..."
openssl genrsa -out "$CERT_DIR/server.key" 2048

openssl req -new \
  -key "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -subj "/CN=$HOSTNAME/O=$ORG"

cat > "$CERT_DIR/server.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = raspberrypi-songs.local
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

openssl x509 -req \
  -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" \
  -CAkey "$CERT_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -days 3650 -sha256 \
  -extfile "$CERT_DIR/server.ext"

chmod 600 "$CERT_DIR"/*.key
chmod 644 "$CERT_DIR"/*.crt

echo "✅ Сертификаты созданы в $CERT_DIR"

echo "🌐 Настраиваю nginx (HTTP→HTTPS + порт 4443 для API)..."

cat > /etc/nginx/sites-available/nevsky-songs << 'NGINX'
# HTTP → HTTPS редирект
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS → Next.js (порт 3000)
server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/ssl/nevsky-songs/server.crt;
    ssl_certificate_key /etc/ssl/nevsky-songs/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Скачать CA-сертификат для установки на устройство
    location = /cert {
        alias /etc/ssl/nevsky-songs/ca.crt;
        add_header Content-Disposition 'attachment; filename="nevsky-songs-ca.crt"';
        add_header Content-Type 'application/x-x509-ca-cert';
    }

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTPS → Express/API (порт 4000), доступен как :4443
server {
    listen 4443 ssl;
    server_name _;

    ssl_certificate     /etc/ssl/nevsky-songs/server.crt;
    ssl_certificate_key /etc/ssl/nevsky-songs/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/nevsky-songs /etc/nginx/sites-enabled/nevsky-songs
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx
systemctl enable nginx

echo ""
echo "✅ Готово!"
echo ""
echo "Плата доступна по адресу: https://raspberrypi-songs.local"
echo "CA-сертификат для установки: https://raspberrypi-songs.local/cert"
echo ""
echo "Каждое устройство должно установить CA один раз:"
echo "  iOS:     Настройки → Основные → VPN и управление устройством → Доверять"
echo "  Android: Настройки → Безопасность → Установить сертификат → CA-сертификат"
echo "  macOS:   Двойной клик по файлу → Связка ключей → Всегда доверять"
