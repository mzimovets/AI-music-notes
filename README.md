# Нотная библиотека — PWA для церковного хора

Progressive Web App для управления нотной библиотекой хора Невского собора.
Работает офлайн, синхронизируется между интернет-сервером и локальной сетью.

---

## Содержание

1. [Стек технологий](#стек-технологий)
2. [Архитектура развёртывания](#архитектура-развёртывания)
3. [Запуск](#запуск)
4. [Переменные окружения](#переменные-окружения)
5. [Синхронизация между серверами](#синхронизация-между-серверами)
6. [Метрики синхронизации](#метрики-синхронизации)
7. [Что можно извлечь из метрик](#что-можно-извлечь-из-метрик)
8. [Скрипты управления БД](#скрипты-управления-бд)
9. [API синхронизации](#api-синхронизации)

---

## Стек технологий

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 14 (App Router), PWA (Serwist / Workbox) |
| UI | HeroUI v2, Tailwind CSS, Framer Motion |
| Auth | NextAuth.js |
| Backend | Express.js |
| База данных | NeDB (файловая, встраиваемая) |
| Realtime | Socket.IO |
| HID-кликер | node-hid (перелистывание нот кнопкой презентера) |

---

## Архитектура развёртывания

Два сервера на одной кодовой базе:

```
Интернет                         Локальная сеть
────────────────                 ──────────────────────────────
songs.nevsky-sobor.ru            192.168.1.10:3000
songs-back.nevsky-sobor.ru:4000  192.168.1.10:4000
  (мастер-сервер)                  (реплика, IS_LOCAL_SERVER=true)
        ▲
        │  pull каждые 5 мин
        │  fullReconciliation раз в сутки
        └──────────────────────────────
```

**Split-DNS:** роутер переопределяет `songs.nevsky-sobor.ru → 192.168.1.10`,
поэтому все устройства в локальной сети прозрачно работают с локальным сервером.
Бэкенд намеренно вынесен на отдельный домен `songs-back.nevsky-sobor.ru` —
чтобы локальный сервер при синхронизации не попадал сам на себя через Split-DNS.

---

## Запуск

```bash
# Frontend (Next.js)
npm install
npm run dev          # разработка — http://localhost:3000
npm run build
npm run start        # продакшн

# Backend (Express)
cd server
npm install
node index.js        # порт 4000
```

---

## Переменные окружения

### Frontend — `.env.local`

```env
NEXTAUTH_SECRET=<случайная строка>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASIC_URL=http://localhost:3000
NEXT_PUBLIC_BASIC_BACK_URL=http://localhost:4000
```

### Backend — `server/.env.local`

```env
NEXTAUTH_SECRET=<та же строка, что во frontend>
NEXTAUTH_URL=http://localhost:3000
REGENT_PASSWORD=<пароль регента>
SINGER_PASSWORD=<пароль певчих>

# Синхронизация (только для локального сервера)
SYNC_API_KEY=<длинный случайный hex>
IS_LOCAL_SERVER=true
SYNC_MASTER_URL=https://songs-back.nevsky-sobor.ru
```

На интернет-сервере `IS_LOCAL_SERVER` не задаётся — планировщик синхронизации не запускается.

---

## Синхронизация между серверами

Реализована в `server/sync-client.js`. Запускается только при `IS_LOCAL_SERVER=true`.

### Soft-delete

Вместо физического удаления записи помечаются:
```js
{ $set: { deletedAt: Date.now(), updatedAt: Date.now() } }
```
Все `find`-запросы фильтруют `{ deletedAt: { $exists: false } }`.
Это позволяет реплике узнать об удалениях через дельта-экспорт.

### Pull-синхронизация — `syncFromInternet()` (каждые 5 минут)

```
GET /api/sync/export?since=<lastTimestamp>
  → { songs, stacks, deletedSongIds, deletedStackIds, timestamp }
```

1. Upsert полученных songs и stacks в локальную БД
2. Скачать PDF-файлы, которых нет локально
3. Физически удалить записи из `deletedSongIds` / `deletedStackIds`
4. Сохранить новый `timestamp` в `sync-state.json`

### Full Reconciliation — `fullReconciliation()` (раз в сутки)

Закрывает случай «Local wins» — когда запись создана напрямую на локальном сервере
или была hard-deleted на мастере.

```
GET /api/sync/ids
  → { songIds, stackIds, songsWithMissingFiles }
```

1. Для локальных songs/stacks, которых нет на мастере → `pushSongToRemote()` / `pushStackToRemote()`
2. Для `songsWithMissingFiles` (файл есть в БД мастера, но отсутствует на диске) → `pushFileToRemote()`

### Почему `uploadTemp` вместо основного multer

Основной multer сохраняет файл сразу в `server/uploads/` с финальным именем.
При последующей проверке `existsSync(targetPath)` возвращает `true` (ложный positive) —
код думает «файл уже есть» и вызывает `fs.unlinkSync`, удаляя только что принятый файл.

`uploadTemp = multer({ dest: os.tmpdir() })` пишет во временную папку ОС с рандомным хешем —
коллизий не возникает. После проверки файл перемещается через `rename` (или `copyFileSync + unlink`
при `EXDEV`-ошибке на разных разделах ФС).

---

## Метрики синхронизации

Реализованы для обоснования научной новизны архитектурных решений.
Хранятся в отдельной коллекции `server/sync_metrics.db`.

### Метрика №2 — Задержка синхронизации (Sync Lag)

**Что измеряется:** время между моментом изменения записи на мастере (`updatedAt`)
и моментом получения её репликой.

```js
// sync-client.js — вычисляется при каждом pull-синке
const receiveTs = Date.now();
const lagValues = [...songs, ...stacks]
  .filter((d) => d.updatedAt && d.updatedAt > 0)
  .map((d) => receiveTs - d.updatedAt)
  .filter((lag) => lag >= 0); // отрицательные — аномалия расхождения часов

const lagStats = calcStats(lagValues);
// → { count, avgMs, medianMs, p95Ms, minMs, maxMs }
```

**Зачем:** характеризует eventual consistency системы. Показывает, насколько
локальная копия «отстаёт» от мастера в худшем случае (p95).

**Ожидаемые значения:** при интервале 5 минут — медианный lag ~5–10 минут
(время от создания записи до следующего синка). p95 ≤ 15 минут.

### Метрика №3 — Эффективность полосы пропускания (Bandwidth Efficiency)

**Что измеряется:** отношение объёма дельта-ответа к объёму полного экспорта.

```js
// Читаем ответ как текст перед парсингом — это единственный способ точно
// измерить байты, так как Content-Length не всегда присутствует в ответе
const responseText = await res.text();
const deltaBytes = Buffer.byteLength(responseText, "utf8");
data = JSON.parse(responseText);

// После применения дельты считаем total в локальной БД
const totalLocalRecords = await dbCount({
  docType: { $in: ["song", "stack"] },
  deletedAt: { $exists: false },
});

// reductionRatio: 0.97 означает «передано лишь 3% от полного объёма»
const reductionRatio = 1 - deltaRecords / totalLocalRecords;
```

**Зачем:** количественно обосновывает выбор delta-синхронизации вместо
полной пересинхронизации при каждом запросе.

### Структура записи метрики

```json
{
  "_id": "delta_sync_1748000000000",
  "type": "delta_sync",
  "timestamp": 1748000000000,
  "since": 1747999700000,
  "durationMs": 312,

  "lag": {
    "count": 3,
    "avgMs": 185000,
    "medianMs": 172000,
    "p95Ms": 290000,
    "minMs": 94000,
    "maxMs": 310000
  },

  "bandwidth": {
    "deltaBytes": 4096,
    "deltaRecords": 3,
    "totalLocalRecords": 147,
    "reductionRatio": 0.9796
  }
}
```

### Просмотр метрик через API

```bash
curl -H "Authorization: Bearer <SYNC_API_KEY>" \
  "https://songs-back.nevsky-sobor.ru/api/sync/metrics?limit=50"
```

Ответ содержит массив `metrics` и агрегированную `summary`:

```json
{
  "metrics": [...],
  "summary": {
    "totalSyncs": 288,
    "lag": {
      "avgMs": 195000,
      "medianOfMediansMs": 180000,
      "p95OfP95Ms": 310000,
      "syncsWithChanges": 42
    },
    "bandwidth": {
      "avgReductionRatio": 0.9821,
      "avgDeltaBytes": 1240,
      "totalDeltaBytes": 357120,
      "syncsWithNoChanges": 246
    }
  }
}
```

---

## Что можно извлечь из метрик

### 1. Обнаружение аномалий

Резкий рост `lag.p95Ms` сигнализирует о проблемах с мастер-сервером или расхождении
системных часов. Резкий рост `deltaBytes` — о массовой загрузке файлов.

### 2. Адаптивный интервал синхронизации

Если последние N синков вернули `deltaRecords = 0` — интервал можно увеличить до 15 минут.
Если изменения приходят часто — уменьшить до 1 минуты. Это снижает нагрузку на сервер
без потери свежести данных, и напрямую обосновывается накопленной статистикой.

### 3. Индикатор свежести данных в UI

Из lag-статистики можно вычислить «ожидаемое отставание» и показать пользователю:
*«Библиотека обновлена ~3 мин назад»* или *«Нет соединения с сервером»*.

### 4. Сравнение с альтернативными архитектурами (научная работа)

Накопив 2–4 недели данных, можно построить таблицу/графики:

| Подход | Трафик на синк | Задержка |
|--------|---------------|---------|
| Full sync (baseline) | ~`totalBytes` | ~`syncInterval` |
| **Delta sync (наш)** | **`totalBytes × (1 − reductionRatio)`** | ~`syncInterval` |
| WebSocket / push | минимальный | секунды |

Delta sync выигрывает у full sync по трафику при сохранении той же задержки.
WebSocket выигрывает по задержке, но требует постоянного соединения — неприемлемо
при нестабильном интернете в церкви.

### 5. Корреляция активности со временем

При накоплении данных за несколько недель можно построить тепловую карту:
в какие часы и дни недели регент добавляет ноты (воскресенье утром?).
На основе этого — оптимизировать расписание синков.

### 6. Объём сэкономленного трафика

```
сэкономлено = Σ(avgDeltaBytes / (1 − avgReductionRatio)) − Σ(totalDeltaBytes)
```

Конкретная цифра за месяц: «дельта-синхронизация сэкономила X МБ трафика».

### 7. Надёжность канала связи

Gaps в `timestamp` между записями метрик = периоды, когда локальный сервер
терял интернет. Метрика доступности: `успешных синков / попыток синков`.

---

## Скрипты управления БД

Все скрипты запускаются из папки `server/`.

### Бэкап

```bash
npm run backup                        # автоматический бэкап с timestamp
npm run backup -- before-migration    # бэкап с меткой (хранится бессрочно)
```

Создаёт `server/backups/<timestamp>/` с `database.db`, `uploads/` и `sync-state.json`.
Автоматические бэкапы ротируются — хранятся последние 10.

### Восстановление

```bash
npm run restore                                  # показать список бэкапов
bash scripts/restore.sh 2026-05-01_03-00-00     # восстановить конкретный
```

Перед перезаписью автоматически создаёт бэкап текущего состояния (`pre-restore_*`).

### Очистка мусора

```bash
npm run cleanup:dry    # посмотреть что будет удалено (ничего не трогает)
npm run cleanup        # удалить осиротевшие PDF + жёстко удалить soft-deleted старше 30 дней + компактировать NeDB
npm run cleanup -- --purge-days=7   # сокращённый срок хранения удалённых записей
```

Что делает cleanup:
1. Удаляет PDF-файлы из `uploads/`, не привязанные ни к одной записи в БД
2. Жёстко удаляет записи с `deletedAt` старше N дней
3. Компактирует NeDB (сжимает append-only лог)

### Сброс БД (только для разработки)

```bash
npm run db:reset    # удаляет database.db и uploads/, создаёт бэкап перед сбросом
```

Блокируется при `NODE_ENV=production`. После сброса сервер пересоздаёт БД
с дефолтными пользователями (regent / singer).

---

## API синхронизации

Все эндпоинты (кроме `/api/health`) защищены Bearer-токеном из `SYNC_API_KEY`.

| Метод | Путь | Описание |
|-------|------|---------|
| `GET` | `/api/sync/export?since=<ms>` | Дельта изменений с указанного timestamp |
| `GET` | `/api/sync/ids` | ID всех живых записей + список файлов, отсутствующих на диске |
| `POST` | `/api/sync/push-song` | Upsert песни + файл на мастер (multipart) |
| `POST` | `/api/sync/push-file` | Только файл на мастер, без изменения БД (multipart) |
| `POST` | `/api/sync/push-stack` | Upsert стопки на мастер (JSON) |
| `GET` | `/api/sync/metrics` | Метрики синхронизации с агрегированной сводкой |
| `GET` | `/api/health` | Health check (публичный) |
