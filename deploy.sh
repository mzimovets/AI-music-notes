#!/bin/bash
#
# Выкладка: перенести изменения из репозитория на работающий сервер.
#
# Раньше это были четыре команды подряд, и их легко было выполнить наполовину —
# получить код, но не собрать, или собрать, но не перезапустить. Снаружи это
# выглядит как "обновление не приехало" или, хуже, как испорченная сборка.
#
# Скрипт останавливается на первой же неудаче и ничего не перезапускает, пока
# сборка не прошла: лучше остаться на старой версии, чем на сломанной.
#
# Запуск:
#   на сервере            — bash deploy.sh
#   на плате              — bash deploy.sh board
#   на плате без интернета — bash deploy.sh board-offline
#
# Режим board-offline нужен, когда файлы принесли на плату вручную (tar/scp):
# получать код и зависимости неоткуда, но собрать, перезапустить и — главное —
# показать айди сборки надо так же. Без этой проверки легко решить, что
# обновление приехало, хотя на плате осталась прежняя версия.

set -e

MODE="${1:-server}"

FETCH=1

case "$MODE" in
  board|board-offline)
    APP_DIR="/mnt/ssd/AI-music-notes"
    RESTART='sudo systemctl restart music-backend && sudo systemctl restart music-frontend'
    HEALTH_URL="http://localhost:3000/api/build-id"
    [ "$MODE" = "board-offline" ] && FETCH=0
    ;;
  *)
    APP_DIR="/home/AI-music-notes"
    RESTART='pm2 restart ai-music-back ai-music-front'
    HEALTH_URL="http://127.0.0.1:3000/api/build-id"
    ;;
esac

cd "$APP_DIR"

echo "=== Сборка сейчас: $(curl -s "$HEALTH_URL" || echo "не отвечает")"

if [ "$FETCH" = "1" ]; then
  echo "=== Получаю изменения"
  # Файлы блокировок переписывает npm install, и они блокируют получение кода
  git checkout -- package-lock.json server/package-lock.json 2>/dev/null || true
  git pull

  echo "=== Устанавливаю зависимости"
  npm install --no-audit --no-fund
  [ -d server ] && (cd server && npm install --no-audit --no-fund)
else
  echo "=== Код принесён вручную, получение пропускаю"
fi

echo "=== Собираю"
npm run build

echo "=== Перезапускаю"
eval "$RESTART"

echo "=== Проверяю"
# Даём приложению подняться
for i in $(seq 1 20); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
  if [ "$CODE" = "200" ]; then
    BUILD=$(curl -s "$HEALTH_URL")
    echo "Готово. Работает сборка: $BUILD"
    exit 0
  fi
done

echo "ВНИМАНИЕ: приложение не ответило за 40 секунд."
echo "Посмотрите логи: pm2 logs ai-music-front  (или journalctl -u music-frontend)"
exit 1
