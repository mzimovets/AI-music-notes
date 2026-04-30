#!/bin/bash
# Создаёт бэкап database.db + uploads/ в server/backups/<timestamp>/
# Использование: bash scripts/backup.sh [метка]
# Пример:        bash scripts/backup.sh before-migration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_ROOT="$SERVER_DIR/backups"

LABEL="${1:-}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="${TIMESTAMP}${LABEL:+_$LABEL}"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_NAME"

mkdir -p "$BACKUP_DIR"

if [ -f "$SERVER_DIR/database.db" ]; then
  cp "$SERVER_DIR/database.db" "$BACKUP_DIR/database.db"
  echo "[backup] database.db скопирован"
else
  echo "[backup] ВНИМАНИЕ: database.db не найден"
fi

if [ -d "$SERVER_DIR/uploads" ]; then
  cp -r "$SERVER_DIR/uploads" "$BACKUP_DIR/uploads"
  FILE_COUNT=$(find "$SERVER_DIR/uploads" -type f | wc -l | tr -d ' ')
  echo "[backup] uploads/ скопирован ($FILE_COUNT файлов)"
fi

if [ -f "$SERVER_DIR/sync-state.json" ]; then
  cp "$SERVER_DIR/sync-state.json" "$BACKUP_DIR/sync-state.json"
fi

echo "[backup] Готово: $BACKUP_DIR"

# Оставляем только последние 10 бэкапов (только автоматические, без метки)
KEEP=10
UNLABELED_LIST=$(ls -1d "$BACKUP_ROOT"/[0-9][0-9][0-9][0-9]-* 2>/dev/null \
  | grep -E '/[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}$' | sort)

if [ -n "$UNLABELED_LIST" ]; then
  COUNT=$(echo "$UNLABELED_LIST" | wc -l | tr -d ' ')
  if [ "$COUNT" -gt "$KEEP" ]; then
    DELETE_COUNT=$(( COUNT - KEEP ))
    echo "$UNLABELED_LIST" | head -n "$DELETE_COUNT" | while IFS= read -r OLD; do
      rm -rf "$OLD"
      echo "[backup] Удалён старый бэкап: $(basename "$OLD")"
    done
  fi
fi
