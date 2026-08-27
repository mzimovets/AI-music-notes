"use client";

/**
 * Временная телеметрия для бага "ноты становятся маленькими" (см.
 * app/home/pdfjs.tsx, app/stackView/[id]/components/SwipeBookViewer.tsx,
 * app/stackView/[id]/page.tsx).
 *
 * Баг вероятностный, руками на разработческом устройстве не ловится —
 * дальше гадать по коду бессмысленно, нужны факты с планшета в момент, когда
 * это происходит на месте. Шлём на бэкенд каждое измерение размера и,
 * отдельно, что реально ушло в отрисовку canvas вместе с честным повторным
 * замером в тот же момент — это разом покажет, устарело ли состояние React
 * или контейнер на экране действительно маленький в этот момент.
 *
 * Снять после того, как причина найдётся: этот файл, server/routes/viewer-diag.js,
 * упоминание в server/index.js и вызовы logDiag в трёх местах выше.
 */

import { getBackendBaseUrl } from "./client-url";

// Одна сессия — один запуск приложения. Не переживает перезагрузку страницы
// намеренно: события разных запусков не должны склеиваться в одну картину
const session = Math.random().toString(36).slice(2, 10);
let seq = 0;

export function logDiag(event: string, data: Record<string, unknown> = {}) {
  try {
    const payload = JSON.stringify({
      session,
      seq: seq++,
      event,
      visibility: typeof document !== "undefined" ? document.visibilityState : "n/a",
      ...data,
    });
    const url = `${getBackendBaseUrl()}/api/viewer-diag`;
    // sendBeacon не ждёт ответа и переживает уход со страницы — то, что
    // здесь важнее всего, поскольку событие часто происходит как раз при
    // переключении приложений
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Диагностика не должна ронять сам просмотрщик
  }
}

// Общий маркер переключений видимости — модуль импортируется во всех трёх
// местах, но это side-effect верхнего уровня, а значит выполнится один раз
// независимо от числа импортов (ES-модули — синглтоны)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    logDiag("app:visibility", {});
  });
}
