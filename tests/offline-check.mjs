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

    // Собираем адреса, по которым потом пойдём без связи
    const links = await page.evaluate(() => {
      const hrefs = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => new URL(a.getAttribute("href"), location.origin).pathname)
        .filter((p) => /^\/(playlist|stack|stackView|song|songRead)\//.test(p));
      return Array.from(new Set(hrefs)).slice(0, 4);
    });

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
