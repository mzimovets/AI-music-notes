# 🎵 AI Music Notes - Полная информация о приложении

## 📋 Общее описание
**AI Music Notes** - это полнофункциональное веб-приложение для управления, просмотра и совместного использования музыкальных нот и партитур. Приложение предназначено для музыкальных коллективов, дирижёров, певцов и музыкантов.

**Tech Stack:**
- Frontend: Next.js 15 (React 18) + TypeScript
- Backend: Express.js + Node.js
- Database: NeDB (документная БД)
- Реал-тайм: Socket.IO + WebSocket
- 3D: Three.js (для 3D-визуализации)
- Стили: Tailwind CSS + HeroUI Components
- PDF: PDF.js, react-pdf, pdf-lib

---

## 🎯 Основные функции

### 1. **Управление песнями и партитурами**
- ✅ Загрузка PDF-файлов с музыкальными нотами
- ✅ Просмотр песен с информацией (название, автор, аранжировщик, текст)
- ✅ Редактирование метаданных песен
- ✅ Категоризация и сортировка песен
- ✅ Поиск по названию/автору
- ✅ Кэширование песен для оффлайн-использования

### 2. **Стеки (Stacks) - Сборки песен**
- ✅ Группировка нескольких песен в "стеки" (сборки)
- ✅ Создание и редактирование стеков
- ✅ Опубликование/скрытие стеков
- ✅ Установка цвета обложки (12 вариантов: blue, purple, orange, green и т.д.)
- ✅ Просмотр стеков в 3D-формате (DearFlip viewer)
- ✅ Синхронизация стеков между устройствами

### 3. **Просмотр в 3D формате (DearFlip)**
- ✅ Реалистичная 3D-визуализация книги с перелистыванием страниц
- ✅ DearFlip viewer для профессионального просмотра PDF как "живой" книги
- ✅ Поддержка различных режимов просмотра
- ✅ Кастомизация цвета обложки
- ✅ Плавная анимация перелистывания
- ✅ Синхронизация страниц

### 4. **Средства совместной работы**
- ✅ Синхронизация в реал-тайме через Socket.IO
- ✅ Поддержка нескольких ролей:
  - **Регент** (дирижёр) - управляет песнями, стеками, публикацией
  - **Певец** - просматривает опубликованные стеки
- ✅ QR-код для быстрого доступа
- ✅ WiFi-сканирование и подключение (WiFiQRModal, WiFiScannerModal)
- ✅ Совместный просмотр одного стека (все видят одну страницу)

### 5. **Интерактивные устройства**
- ✅ Поддержка HID-устройств (presentation clicker)
- ✅ WebSocket-соединение для получения команд с клавиатуры/пульта
- ✅ Навигация по страницам с помощью пульта
- ✅ Визуальный индикатор подключения устройства (ClickerIndicator)
- ✅ Батарея устройства (DeviceBatteryModal)

### 6. **Оффлайн функциональность**
- ✅ Service Worker для кэширования контента
- ✅ Синхронизация данных (offline-sync)
- ✅ Очередь запросов при отсутствии сети (offline-queue)
- ✅ Автоматическая переотправка при восстановлении соединения

### 7. **Экспорт и обмен**
- ✅ Скачивание песен (DownloadSong)
- ✅ Печать нот (PrintSong)
- ✅ Скачивание стека как архива
- ✅ Обмен QR-кодом (ShareSong, QRModal)

### 8. **Управление памятью и кэшем**
- ✅ Статистика кэша (CacheStats)
- ✅ Оптимизация памяти браузера
- ✅ Ленивая загрузка изображений
- ✅ Кэширование PDF-страниц

---

## 📁 Структура проекта

### Frontend (`/app`)
```
app/
├── page.tsx                 # Главная страница (альбомы, песни, стеки)
├── home/                    # Компоненты главной страницы
│   ├── albums.tsx          # Галерея альбомов
│   ├── StackCard.tsx       # Карточка стека
│   ├── stacks.tsx          # Список стеков
│   ├── pdfViewer.tsx       # Простой просмотр PDF
│   ├── dropzone.tsx        # Загрузка файлов
│   ├── modalAddScore.tsx   # Добавление новой песни
│   └── search/Search.tsx   # Поиск песен
├── stackView/[id]/         # Просмотр стека
│   ├── page.tsx            # Страница стека
│   └── components/
│       ├── DearFlipViewer.tsx    # 3D-просмотрщик книги
│       ├── StackViewer.tsx       # Основной viewer
│       ├── SideBarStack.tsx      # Боковая панель
│       ├── SongsList.tsx         # Список песен в стеке
│       ├── BookCover.tsx         # Обложка книги
│       └── SwipeBookViewer.tsx   # Альтернативный viewer
├── authPage/               # Страница логина
├── api/                    # API маршруты (Next.js)
└── providers.tsx           # Context providers
```

### Backend (`/server`)
```
server/
├── index.js                # Express app, Socket.IO, HID
├── routes/
│   ├── songs.js           # POST/GET/DELETE песни
│   ├── stacks.js          # POST/GET/DELETE стеки
│   ├── users.js           # Аутентификация, роли
│   └── sync.js            # Синхронизация
├── sync-client.js         # Scheduler для фоновой синхронизации
└── database.db            # NeDB база данных
```

### Компоненты (`/components`)
```
components/
├── navbar.tsx             # Навигационная панель
├── LoadingCamerton.tsx    # Спиннер загрузки
├── CacheStats.tsx         # Статистика кэша
├── DeviceBatteryModal.tsx # Батарея пульта
├── WiFiQRModal.tsx        # WiFi QR-код
├── ServiceWorkerManager.tsx # Управление SW
├── PrintSong.tsx          # Печать
├── DownloadSong.tsx       # Скачивание
├── ShareSong.tsx          # Общий доступ
└── icons/                 # SVG-иконки
```

---

## 🔐 Аутентификация и роли

### Роли пользователей
1. **Регент (Conductor)** - `role: "регент"`
   - Полные права на создание/редактирование/публикацию
   - Управление песнями и стеками
   - Настройка доступа

2. **Певец (Singer)** - `role: "певец"`
   - Просмотр опубликованных стеков
   - Просмотр песен
   - Скачивание для оффлайн

### Аутентификация
- NextAuth для управления сессиями
- Переменные окружения:
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `REGENT_PASSWORD`
  - `SINGER_PASSWORD`

---

## 📡 API Эндпоинты

### Songs
- `GET /songs` - Все песни
- `POST /songs` - Создать песню
- `PUT /songs/:id` - Обновить песню
- `DELETE /songs/:id` - Удалить песню
- `GET /songs/:id` - Одна песня
- `POST /songs/file/:id` - Загрузить файл

### Stacks
- `GET /stacks` - Все стеки
- `POST /stacks` - Создать стек
- `PUT /stacks/:id` - Обновить стек
- `DELETE /stacks/:id` - Удалить стек
- `PUT /stacks/:id/publish` - Опубликовать
- `GET /stacks/:id/export` - Экспорт стека

### Users
- `POST /users/login` - Логин
- `POST /users/register` - Регистрация
- `GET /users/profile` - Профиль
- `POST /users/logout` - Логаут

### Sync
- `POST /sync/push` - Отправка изменений
- `POST /sync/pull` - Получение изменений
- `POST /sync/status` - Статус синхронизации

---

## 🎨 Цвета обложек (COVER_COLORS)

| Имя | HEX | Использование |
|-----|-----|----------------|
| blue | #4A90D9 | Синий |
| brown | #8B5E3C | Коричневый |
| dark-purple | #5B2B8C | Тёмно-фиолетовый |
| green | #3A8C5C | Зелёный |
| grey | #7A8A99 | Серый |
| ocean | #1A7A9A | Океан |
| orange | #D9823A | Оранжевый |
| purple | #7A4AB0 | Фиолетовый |
| red | #C0392B | Красный |
| salat | #7AB040 | Салат |
| white | #C8BEB5 | Белый |
| yellow | #D4A843 | Жёлтый |

---

## 🔄 Реал-тайм синхронизация

### Socket.IO события
```javascript
// От сервера к клиентам
'stack:updated'        // Стек обновлен
'stack:deleted'        // Стек удален
'stack:published'      // Стек опубликован
'song:updated'         // Песня обновлена
'song:deleted'         // Песня удалена
'page:changed'         // Текущая страница изменилась
'clicker'              // Команда с пульта
'clicker-connected'    // Статус пульта
```

### WebSocket (HID Clicker)
```javascript
// Порт 3001
{ type: 'clicker', direction: 'next|prev' }
{ type: 'clicker-connected', connected: true|false }
```

---

## 📦 Функции кэширования

### Service Worker
- Кэширование HTML/CSS/JS
- Кэширование изображений и иконок
- Кэширование PDF-файлов
- Offline fallback

### IndexedDB
- Хранение песен
- Хранение стеков
- Кэш текстур для 3D
- Очередь синхронизации

---

## 🚀 Технологии и либы

### Frontend
- **Next.js 15** - React framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **HeroUI** - Component library
- **Framer Motion** - Animations
- **Three.js** - 3D graphics (для будущего 3D viewer)
- **react-pdf** - PDF viewing
- **Socket.IO Client** - Real-time communication
- **next-auth** - Authentication

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime
- **NeDB** - Document database
- **Socket.IO** - Real-time server
- **node-hid** - HID device support
- **ws** - WebSocket server
- **pdf-lib** - PDF manipulation

### DevTools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Tailwind** - CSS utility

---

## 🔧 Переменные окружения

```env
# Authentication
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=http://localhost:3000
REGENT_PASSWORD=<password>
SINGER_PASSWORD=<password>

# URLs
NEXT_PUBLIC_BASIC_URL=http://localhost:3000
NEXT_PUBLIC_BASIC_BACK_URL=http://localhost:4000

# Database (if needed)
DATABASE_URL=./database.db
```

---

## 📊 Структура данных

### Song (Песня)
```json
{
  "_id": "song_123",
  "name": "Название песни",
  "author": "Композитор",
  "authorLyrics": "Поэт",
  "authorArrange": "Аранжировщик",
  "category": "Религиозная",
  "file": {
    "name": "file.pdf",
    "size": 2048,
    "path": "/uploads/songs/file.pdf"
  },
  "docType": "song",
  "createdAt": "2024-04-01T12:00:00Z",
  "updatedAt": "2024-04-01T12:00:00Z"
}
```

### Stack (Сборка)
```json
{
  "_id": "stack_123",
  "name": "Пасхальные песни",
  "description": "Набор пасхальных песен",
  "songs": ["song_1", "song_2", "song_3"],
  "coverColor": "blue",
  "isPublished": true,
  "cover": "cover.png",
  "docType": "stack",
  "createdBy": "user_123",
  "createdAt": "2024-04-01T12:00:00Z",
  "updatedAt": "2024-04-01T12:00:00Z"
}
```

---

## 🎯 Путь использования приложения

### Для Регента:
1. Логин (регент пароль)
2. Загрузить PDF-файл песни
3. Заполнить метаданные (название, автор)
4. Создать стек
5. Добавить песни в стек
6. Выбрать цвет обложки
7. Опубликовать стек
8. Синхронизировать (по WiFi или QR)

### Для Певца:
1. Логин (певец пароль)
2. Просмотр опубликованных стеков
3. Открыть стек в 3D-режиме
4. Перелистывать страницы (мышь, пульт, сенсор)
5. Скачать для оффлайн (опционально)

---

## 🔄 Процесс синхронизации

```mermaid
Устройство 1 → Изменение (POST /sync/push) → Сервер
                    ↓
                Broadcast (Socket.IO)
                    ↓
Устройство 2 ← Получение (Socket.IO) ← Сервер
```

---

## 📱 Поддерживаемые платформы

- ✅ Desktop (Chrome, Safari, Firefox)
- ✅ Tablet (iPad, Android tablets)
- ✅ Mobile (iPhone, Android phones)
- ✅ Offline mode (Service Worker)
- ✅ HID devices (Presentation remote)

---

## 🎓 Будущие улучшения

На основе TODO в проекте:
1. Полная миграция сервера на Next.js
2. Оптимизация синхронизации
3. Расширенное 3D-моделирование
4. Поддержка аннотаций
5. Система комментариев
6. Версионирование документов

---

## 📞 Контакты и поддержка

- Разработка: AI Music Notes Team
- Лицензия: MIT
- GitHub: [AI-music-notes](ссылка на репозиторий)

---

## 🔐 Безопасность

- ✅ Session-based authentication (NextAuth)
- ✅ Role-based access control (RBAC)
- ✅ Пароль зашифрован (bcryptjs)
- ✅ CORS защита
- ✅ Валидация входных данных

---

**Последнее обновление:** 2024-04-29
