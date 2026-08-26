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
# ГЛАВНОЕ ОБ ОКРУЖЕНИИ. Переменные NEXT_PUBLIC_* впекаются в клиентский код
# в момент сборки — потом их не поменять. Пока сервер собирал себя сам, он
# брал свои собственные значения и всё сходилось. Стоило перенести сборку
# сюда — в неё уехал адрес бэкенда с этой машины (http://localhost:4000).
# В браузере он превращался в http://<хост страницы>:4000, страница при этом
# отдаётся по https, и браузер молча блокировал такой запрос как смешанное
# содержимое. Наружу это выглядело как «приложение открывается, но пустое»:
# поиск ничего не находит, программ нет, ничего не кешируется, а список
# разделов подменялся запасным из constants.ts — все запросы к бэкенду из
# браузера тихо падали в catch.
#
# Поэтому переменные берём с самого сервера, перед сборкой, и собираем с
# ними. И не собираем вовсе, если адрес бэкенда получился localhost — эта
# ошибка ничем себя не проявляет до самого выступления.
#
# Запуск: bash deploy-server-prebuilt.sh

set -e

SERVER_HOST="root@4678e4d48708.vps.myjino.ru"
SERVER_PORT="49190"
SERVER_DIR="/home/AI-music-notes"

# Одно соединение на все команды: пароль спрашивается один раз, а не по разу
# на каждый ssh и rsync
SSH_CTL="/tmp/ai-music-deploy-%r@%h_%p"
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$SSH_CTL -o ControlPersist=10m -p $SERVER_PORT"
SSH="ssh $SSH_OPTS $SERVER_HOST"

cleanup() {
  ssh -O exit -o ControlPath="$SSH_CTL" -p "$SERVER_PORT" "$SERVER_HOST" 2>/dev/null || true
}
trap cleanup EXIT

echo "=== Забираю с сервера его NEXT_PUBLIC_* — они впекаются в сборку"
# .env.local важнее .env (так же, как их читает сам Next.js), поэтому сначала
# .env, следом .env.local — при повторе побеждает прочитанное последним.
# Берём только NEXT_PUBLIC_*: они и так уезжают в браузер, секретов там нет
SERVER_ENV="$(mktemp)"
trap 'rm -f "$SERVER_ENV"; cleanup' EXIT
$SSH "cat $SERVER_DIR/.env 2>/dev/null; echo; cat $SERVER_DIR/.env.local 2>/dev/null" \
  | grep -E '^[[:space:]]*NEXT_PUBLIC_[A-Z0-9_]+=' \
  | sed 's/^[[:space:]]*//' > "$SERVER_ENV" || true

if [ ! -s "$SERVER_ENV" ]; then
  echo "ОШИБКА: на сервере не нашлось ни одной NEXT_PUBLIC_* переменной."
  echo "        Собирать с местными значениями нельзя — в сборку уедет localhost."
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$SERVER_ENV"
set +a

# То же правило, что и в lib/client-url.ts: браузер берёт BROWSER, а если
# его нет — BASIC
BROWSER_BACK="${NEXT_PUBLIC_BROWSER_BACK_URL:-$NEXT_PUBLIC_BASIC_BACK_URL}"
echo "    адрес бэкенда для браузера: ${BROWSER_BACK:-<пусто>}"

case "$BROWSER_BACK" in
  ""|*localhost*|*127.0.0.1*)
    echo
    echo "ОШИБКА: адрес бэкенда для браузера — '$BROWSER_BACK'."
    echo "        С таким адресом собранное приложение открывается, но остаётся"
    echo "        пустым: браузер не может достучаться до бэкенда, и все запросы"
    echo "        молча падают. Пропишите на сервере в $SERVER_DIR/.env.local"
    echo "        строку NEXT_PUBLIC_BROWSER_BACK_URL=https://songs-back.nevsky-sobor.ru"
    echo "        (или тот адрес, по которому бэкенд доступен снаружи) и повторите."
    exit 1
    ;;
esac

echo "=== Собираю здесь с серверными переменными"
npm run build

echo "=== Заливаю готовую .next на сервер (кеш сборки — 851 МБ у нас — не нужен вовсе)"
rsync -avz --delete \
  --exclude=.next/cache \
  -e "ssh $SSH_OPTS" \
  .next \
  "$SERVER_HOST:$SERVER_DIR/"

# public/sw.js генерируется сборкой и лежит в .gitignore — значит через git
# он на сервер не попадает никогда. Пока сервер собирал себя сам, он делал
# его себе на месте и всё сходилось. После переноса сборки сюда на сервере
# остался sw.js от старой сборки: внутри него список файлов, которые он
# обязан скачать при установке, а --delete выше эти файлы как раз удалил.
# Один 404 — и установка service worker падает целиком, он не активируется,
# и офлайн-кеширование не начинается вовсе: полоса готовности вечно на нуле,
# а кнопка «догрузить» гоняет запросы, которым уже некуда лечь
echo "=== Заливаю service worker (в git его нет, только сборка его делает)"
rsync -avz -e "ssh $SSH_OPTS" public/sw.js "$SERVER_HOST:$SERVER_DIR/public/sw.js"

# На самом первом запуске на сервере ещё старая версия deploy.sh, которая
# про server-nobuild не знает — подтягиваем код явно, чтобы сам скрипт
# обновился раньше, чем мы его вызовем. На всех следующих запусках это
# просто безобидное повторение того же самого шага
echo "=== Обновляю сам deploy.sh на сервере (на случай первого запуска)"
$SSH "cd $SERVER_DIR && git fetch origin main && git reset --hard origin/main"

echo "=== На сервере: код через git, зависимости, перезапуск (без сборки)"
$SSH "cd $SERVER_DIR && bash deploy.sh server-nobuild"

# Сверяем, что снаружи отдаётся именно наш service worker. Разошедшийся
# sw.js — единственная поломка здесь, которую совсем не видно снаружи:
# приложение открывается и работает, молчит и консоль, просто офлайн
# перестаёт набираться, и узнаётся об этом там, где интернета уже нет
echo "=== Сверяю service worker снаружи"
PUBLIC_URL="${NEXT_PUBLIC_BASIC_URL:-https://songs.nevsky-sobor.ru}"
LOCAL_SW="$(shasum -a 256 public/sw.js | cut -d' ' -f1)"
REMOTE_SW="$(curl -fsS --max-time 30 "$PUBLIC_URL/sw.js" | shasum -a 256 | cut -d' ' -f1)"

if [ "$LOCAL_SW" = "$REMOTE_SW" ]; then
  echo "Готово. Service worker снаружи совпадает со сборкой."
else
  echo
  echo "ВНИМАНИЕ: по $PUBLIC_URL отдаётся не тот service worker."
  echo "          Приложение будет работать, но офлайн-кеширование не начнётся."
  echo "          здесь:  $LOCAL_SW"
  echo "          там:    $REMOTE_SW"
  exit 1
fi
