#!/bin/bash
#
# Собирает проект здесь (там, где запущен скрипт) и заливает готовую .next
# на сервер — сама сборка там больше не запускается.
#
# Почему: сервер общий, 4 ГБ без подкачки, и у "next build" там не хватает
# памяти даже на запуск дочернего процесса (ENOMEM) — не помогло ни
# ограничение параллелизма, ни ограничение кучи V8. Собирать в другом месте
# и заливать готовое — надёжный обход, а не заплатка: .next не привязан к
# машине, где собран (нативных модулей внутри него нет, они остаются в
# node_modules на сервере и не трогаются).
#
# Код (server/, next.config.mjs, package.json и т.д.) по-прежнему тянется
# сервером через git как обычно, через deploy.sh server-nobuild — с этим
# проблем не было, падал только сам "next build" внутри него.
#
# Переменные окружения NEXT_PUBLIC_* в сборке — localhost-заглушки
# (см. .env/.env.local), реальный адрес бэкенда подставляется в браузере
# на лету (lib/client-url.ts, replaceLocalHostname) — поэтому сборка отсюда
# одинаково годится для любого хоста, куда её зальют.
#
# Запуск: bash deploy-server-prebuilt.sh

set -e

SERVER_HOST="root@4678e4d48708.vps.myjino.ru"
SERVER_PORT="49190"
SERVER_DIR="/home/AI-music-notes"

echo "=== Собираю здесь"
npm run build

echo "=== Заливаю готовую .next на сервер (кеш сборки — 851 МБ у нас — не нужен вовсе)"
rsync -avz --delete \
  --exclude=.next/cache \
  -e "ssh -p $SERVER_PORT" \
  .next \
  "$SERVER_HOST:$SERVER_DIR/"

SSH="ssh -p $SERVER_PORT $SERVER_HOST"

# На самом первом запуске на сервере ещё старая версия deploy.sh, которая
# про server-nobuild не знает — подтягиваем код явно, чтобы сам скрипт
# обновился раньше, чем мы его вызовем. На всех следующих запусках это
# просто безобидное повторение того же самого шага
echo "=== Обновляю сам deploy.sh на сервере (на случай первого запуска)"
$SSH "cd $SERVER_DIR && git fetch origin main && git reset --hard origin/main"

echo "=== На сервере: код через git, зависимости, перезапуск (без сборки)"
$SSH "cd $SERVER_DIR && bash deploy.sh server-nobuild"
