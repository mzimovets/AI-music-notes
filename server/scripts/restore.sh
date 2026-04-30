#!/bin/bash
# Восстанавливает БД и файлы из бэкапа.
# Использование: bash scripts/restore.sh [имя_бэкапа]
# Без аргумента — показывает список доступных бэкапов.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_ROOT="$SERVER_DIR/backups"

list_backups() {
  echo "Доступные бэкапы:"
  ls -1d "$BACKUP_ROOT"/[0-9][0-9][0-9][0-9]-* 2>/dev/null | while read -r B; do
    NAME=$(basename "$B")
    SIZE=$(du -sh "$B" 2>/dev/null | cut -f1)
    echo "  $NAME  ($SIZE)"
  done
}

if [ -z "$1" ]; then
  list_backups
  echo ""
  echo "Запустите: bash scripts/restore.sh <имя_бэкапа>"
  exit 0
fi

BACKUP_DIR="$BACKUP_ROOT/$1"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "[restore] Бэкап не найден: $BACKUP_DIR"
  list_backups
  exit 1
fi

echo "[restore] Восстанавливаем из: $BACKUP_DIR"
echo ""
echo "ВНИМАНИЕ: текущая БД и файлы будут перезаписаны."
read -r -p "Продолжить? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "[restore] Отменено."
  exit 0
fi

# Бэкап текущего состояния перед восстановлением
SAFEGUARD="$BACKUP_ROOT/pre-restore_$(date +"%Y-%m-%d_%H-%M-%S")"
mkdir -p "$SAFEGUARD"
[ -f "$SERVER_DIR/database.db" ] && cp "$SERVER_DIR/database.db" "$SAFEGUARD/database.db"
[ -d "$SERVER_DIR/uploads" ] && cp -r "$SERVER_DIR/uploads" "$SAFEGUARD/uploads"
echo "[restore] Текущее состояние сохранено в: $SAFEGUARD"

if [ -f "$BACKUP_DIR/database.db" ]; then
  cp "$BACKUP_DIR/database.db" "$SERVER_DIR/database.db"
  echo "[restore] database.db восстановлен"
fi

if [ -d "$BACKUP_DIR/uploads" ]; then
  rm -rf "$SERVER_DIR/uploads"
  cp -r "$BACKUP_DIR/uploads" "$SERVER_DIR/uploads"
  FILE_COUNT=$(find "$SERVER_DIR/uploads" -type f | wc -l | tr -d ' ')
  echo "[restore] uploads/ восстановлен ($FILE_COUNT файлов)"
fi

if [ -f "$BACKUP_DIR/sync-state.json" ]; then
  cp "$BACKUP_DIR/sync-state.json" "$SERVER_DIR/sync-state.json"
  echo "[restore] sync-state.json восстановлен"
fi

echo "[restore] Готово. Перезапустите сервер."
