/**
 * Проверка того, ради чего всё приложение и делалось: работы без связи.
 *
 * Появилась после нескольких поломок подряд, каждую из которых находил регент
 * на планшете, а не разработчик. Цикл проверки занимал полчаса — перенести файлы
 * на плату, пересобрать, переустановить приложение, включить режим самолёта, —
 * поэтому правки уезжали непроверенными. Здесь то же самое занимает полминуты.
 *
 * Ловит ровно те беды, что случались:
 *   1. страница подменялась главной, и приложение оживало наполовину;
 *   2. вместо нот показывался служебный текст из символов;
 *   3. тяжёлый пересчёт подвешивал экран, и всё висело в загрузке.
 *
 * Запуск:
 *   cd tests && npm install && npm run check
 *
 * Логин берётся из окружения, чтобы не хранить его в коде:
 *   NOTES_LOGIN=regent NOTES_PASSWORD=... npm run check
 */

import { chromium } from "playwright";

const BASE = process.env.NOTES_URL ?? "http://localhost:3000";
const LOGIN = process.env.NOTES_LOGIN ?? "regent";
const PASSWORD = process.env.NOTES_PASSWORD ?? "";

/** Сколько ждать полного кеширования, прежде чем уходить в офлайн */
const CACHE_WAIT_MS = 90_000;
/** Дольше этого отклик на нажатие считаем зависанием */
const RESPONSE_LIMIT_MS = 3_000;

const results = [];
let failed = 0;

function report(ok, name, detail = "") {
  results.push({ ok, name, detail });
  if (!ok) failed++;
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

/**
 * Признаки того, что на экране не приложение, а сырьё.
 *
 * Служебный пакет данных Next.js начинается со строк вида `0:["$","$L1"`, и
 * именно он однажды оказался на экране вместо нот.
 */
function looksLikeRawPayload(text) {
  return /^\s*\d+:\[/.test(text) || text.includes('self.__next_f.push') === false && /"\$L\d+"/.test(text);
}

async function measureResponsiveness(page) {
  // Замеряем, за сколько страница отвечает на простейшее действие. Если главный
  // поток занят тяжёлой работой, ответ придёт с задержкой — так и ловится
  // подвисание, которого не видно по внешнему виду страницы
  const started = Date.now();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
  return Date.now() - started;
}

async function main() {
  if (!PASSWORD) {
    console.error("Не задан пароль. Запуск: NOTES_PASSWORD=... npm run check");
    process.exit(2);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1024, height: 1366 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    // ── Вход ────────────────────────────────────────────────────────────────
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    if (page.url().includes("authPage")) {
      await page.fill('input[placeholder="Введите логин"]', LOGIN);
      await page.fill('input[placeholder="Введите пароль"]', PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("authPage"), { timeout: 30_000 });
    }
    report(true, "Вход выполнен");

    // ── Ждём, пока приложение скачает всё себе ───────────────────────────────
    const cachedEverything = await page
      .waitForFunction(
        async () => {
          const keys = await caches.keys();
          if (keys.length === 0) return false;
          // Главная и движок просмотра — обязательный минимум
          const home = await caches.match("/", { ignoreSearch: true, ignoreVary: true });
          const worker = await caches.match("/api/pdf-worker", { ignoreSearch: true, ignoreVary: true });
          return !!home && !!worker;
        },
        null,
        { timeout: CACHE_WAIT_MS },
      )
      .then(() => true)
      .catch(() => false);
    report(cachedEverything, "Приложение скачало себя в память устройства");

    /**
     * Ждём окончания скачивания, а не его начала.
     *
     * Обязательный минимум появляется в кеше почти сразу, а ноты качаются ещё
     * долго. Уйти в офлайн в этот момент — значит проверить полупустой кеш и
     * получить бодрое «всё хорошо». Считаем записи, пока их число не перестанет
     * расти.
     */
    let previousCount = -1;
    let stableFor = 0;
    const cacheDeadline = Date.now() + CACHE_WAIT_MS;
    while (Date.now() < cacheDeadline && stableFor < 3) {
      await page.waitForTimeout(2000);
      const count = await page.evaluate(async () => {
        let total = 0;
        for (const name of await caches.keys()) {
          total += (await caches.open(name).then((c) => c.keys())).length;
        }
        return total;
      });
      stableFor = count === previousCount ? stableFor + 1 : 0;
      previousCount = count;
    }
    report(previousCount > 0, "Скачивание завершилось", `${previousCount} записей в памяти`);

    /**
     * Адреса берём из списков самого приложения, а не из ссылок на странице.
     *
     * По ссылкам находилось пусто: переходы сделаны не тегами <a>, и проверка
     * молча ограничивалась одной главной — то есть говорила «всё хорошо», ни
     * разу не открыв ни программы, ни ноты. Ровно та ложная уверенность, от
     * которой всё это и затевалось.
     */
    const links = await page.evaluate(() => {
      const read = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key) ?? "") ?? fallback; }
        catch { return fallback; }
      };
      const snapshot = read("cache-readiness-snapshot-v1", { stacks: [], songs: [] });
      const categories = read("offline-categories-v1", []);

      const paths = [];
      const stack = snapshot.stacks?.[0];
      const song = snapshot.songs?.[0];
      const category = categories?.[0];

      if (category?.key) paths.push(`/playlist/${category.key}`);
      if (stack?.id) paths.push(`/stackView/${stack.id}`);
      if (song?.id) paths.push(`/songRead/${song.id}`, `/song/${song.id}`);
      return paths;
    });

    report(
      links.length >= 3,
      "Найдены страницы для проверки",
      links.length ? links.join(", ") : "ни одной — проверять нечего",
    );

    // Прогреваем найденные страницы, пока связь ещё есть
    for (const path of links) {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
    }
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    // ── Режим самолёта ───────────────────────────────────────────────────────
    await context.setOffline(true);
    report(true, `Связь отключена, проверяем ${links.length + 1} страниц`);

    for (const path of ["/", ...links]) {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(1200);

      const body = await page.evaluate(() => document.body?.innerText ?? "");
      const hasApp = await page.evaluate(() => !!document.querySelector("main, [class*=fixed]"));

      report(!looksLikeRawPayload(body), `Без связи ${path}: на экране приложение, а не служебный текст`);
      report(hasApp, `Без связи ${path}: страница отрисовалась`);

      const responseMs = await measureResponsiveness(page);
      report(
        responseMs < RESPONSE_LIMIT_MS,
        `Без связи ${path}: экран откликается`,
        `${responseMs} мс`,
      );
    }

    /**
     * Кнопки внутри программы. Когда страница подменялась главной, приложение
     * оживало наполовину: с виду ноты на месте, а кнопка закрытия и боковое
     * меню не отзывались. По внешнему виду это не отличить — только нажатием.
     */
    const stackPath = links.find((p) => p.startsWith("/stackView/"));
    if (stackPath) {
      await page.goto(BASE + stackPath, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(2500);

      /**
       * Самое важное: лист действительно нарисован и целиком.
       *
       * Ноты не раз выходили обрезанными — верх есть, низ пустой, — или
       * рисовались выше экрана, и нижняя половина уходила за край. Со стороны
       * страница при этом выглядит рабочей, поэтому смотрим на размеры холста
       * и его положение, а не на наличие.
       */
      await page.waitForSelector("canvas", { timeout: 20_000 }).catch(() => {});
      const sheet = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          width: Math.round(rect.width),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          screen: window.innerHeight,
        };
      });

      report(!!sheet, "Без связи лист нот нарисован", sheet ? `${sheet.width}×${sheet.height}` : "холста нет");

      if (sheet) {
        // Лист должен занимать большую часть экрана: вдвое меньший означает,
        // что просмотрщику досталась неверная высота
        report(
          sheet.height > sheet.screen * 0.6,
          "Лист занимает экран, а не его часть",
          `${sheet.height} при экране ${sheet.screen}`,
        );
        // И помещаться в него целиком, а не уходить за край
        report(
          sheet.top >= -8 && sheet.bottom <= sheet.screen + 8,
          "Лист не обрезан краями экрана",
          `${sheet.top}…${sheet.bottom}`,
        );
      }

      const buttons = await page.evaluate(() => document.querySelectorAll("button").length);
      report(buttons > 0, "Без связи в программе есть кнопки", `${buttons} шт.`);

      // Боковое меню — вторая кнопка, которая переставала отзываться
      const sidebar = page.getByRole("button", { name: "Список песен программы" });
      const hasSidebar = (await sidebar.count()) > 0;
      report(hasSidebar, "Кнопка списка песен найдена");
      if (hasSidebar) {
        await sidebar.first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);
        const opened = await page.evaluate(() =>
          /песн|программ/i.test(document.body.innerText),
        );
        report(opened, "Без связи список песен открывается");
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(500);
      }

      /**
       * Закрытие идёт в два шага: кнопка открывает подтверждение «Выйти?», и
       * только «Закрыть» в нём уводит на главную. Проверяем оба, иначе нажатие
       * считалось бы неудачным просто потому, что адрес не сменился сразу.
       */
      const before = page.url();
      const close = page.getByRole("button", { name: "Закрыть программу" });
      const hasClose = (await close.count()) > 0;
      report(hasClose, "Кнопка закрытия программы найдена");

      if (hasClose) {
        await close.first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);

        const confirm = page.getByRole("button", { name: "Закрыть", exact: true });
        const askedConfirmation = (await confirm.count()) > 0;
        report(askedConfirmation, "Без связи спрашивается подтверждение выхода");

        if (askedConfirmation) {
          await confirm.first().click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(2000);
          report(page.url() !== before, "Без связи выход из программы работает", page.url());
        }
      }
    }

    // ── Ошибки воркера ───────────────────────────────────────────────────────
    const swErrors = consoleErrors.filter((e) => /no-response|FetchEvent/.test(e));
    report(swErrors.length === 0, "Воркер не отдавал ошибок вместо страниц", swErrors[0] ?? "");

    await context.setOffline(false);
  } finally {
    await browser.close();
  }

  console.log("");
  if (failed > 0) {
    console.log(`Проверка не пройдена: ${failed} из ${results.length}.`);
    console.log("Выкладывать в таком виде нельзя — на планшете будет то же самое.");
    process.exit(1);
  }
  console.log(`Все проверки пройдены (${results.length}).`);
}

main().catch((e) => {
  console.error("Проверка сорвалась:", e?.message ?? e);
  process.exit(1);
});
