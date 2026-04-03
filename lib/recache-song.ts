/**
 * Запускает перекэширование песни и ждёт его завершения.
 * Показывает анимацию в ServiceWorkerManager через событие sw-recache-song.
 * Резолвится по событию sw-recache-done или через 6 секунд (таймаут).
 */
export function recacheSong(id: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("sw-recache-done", onDone);
      resolve();
    };

    const onDone = (e: Event) => {
      if ((e as CustomEvent<string>).detail === id) finish();
    };

    const timer = setTimeout(finish, 6000);

    window.addEventListener("sw-recache-done", onDone);
    window.dispatchEvent(new CustomEvent("sw-recache-song", { detail: id }));
  });
}
