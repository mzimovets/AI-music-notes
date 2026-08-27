"use client";

/**
 * Просит перемерить размер несколько раз после возврата в приложение — не
 * один.
 *
 * На iPad после возврата из свёрнутого состояния (или из переключателя
 * задач) один кадр не гарантирует, что раскладка уже настоящая: WebKit
 * иногда ещё какое-то время отдаёт geometry, посчитанную до восстановления.
 * Единственная попытка замера — даже через requestAnimationFrame — время от
 * времени попадала именно в этот момент, и размер застревал неверным до
 * следующего случайного изменения, которого могло и не произойти вовсе.
 * Отсюда и «через раз» — эффект чисто вероятностный, не завязан на
 * конкретное действие.
 *
 * Здесь после каждого сигнала о возврате видимости замер повторяется ещё
 * несколько раз в течение примерно секунды — редкое совпадение с неудачным
 * моментом перестаёт иметь значение, потому что следующая попытка почти
 * наверняка попадёт на уже настоящую раскладку.
 */
export function watchResume(measure: () => void): () => void {
  let timers: number[] = [];

  const clearTimers = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
  };

  const burst = () => {
    clearTimers();
    // Двойной requestAnimationFrame — стандартный приём дождаться, пока
    // браузер точно посчитал раскладку после возврата, а не отдал кадр,
    // подготовленный ещё до него
    requestAnimationFrame(() => requestAnimationFrame(measure));
    // И ещё догоняем чуть позже — на случай отложенного рендера/шрифтов,
    // которые сами по себе меняют раскладку уже после первого кадра
    timers.push(window.setTimeout(measure, 300));
    timers.push(window.setTimeout(measure, 900));
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") burst();
  };
  const onResume = () => burst();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onResume);
  window.addEventListener("focus", onResume);

  return () => {
    clearTimers();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onResume);
    window.removeEventListener("focus", onResume);
  };
}
