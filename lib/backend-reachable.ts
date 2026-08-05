import { getBackendBaseUrl } from "./client-url";

/**
 * Проверяет связь с сервером запросом, а не флагом navigator.onLine: тот
 * возвращает false на мобильных даже при подключении к хотспоту платы, и
 * наоборот — true, когда интернета фактически нет.
 *
 * Нужна, чтобы не выдавать «сохранено офлайн» на обычную ошибку сервера:
 * человек видит обещание отправить позже, хотя запись просто не прошла.
 */
export async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${getBackendBaseUrl()}/api/ping`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
