/**
 * Проверенный вживую адрес бэкенда платы (Express).
 *
 * getBackendBaseUrl() в client-url.ts подставляет в адрес то, что сейчас в
 * адресной строке браузера — расчёт на то, что на своей точке доступа плата
 * подменяет DNS для songs.nevsky-sobor.ru и заворачивает его на себя
 * (address=/songs.nevsky-sobor.ru/192.168.4.1 в dnsmasq). Через сторонний
 * роутер такой подмены нет: результат указывает в никуда, и живые данные
 * (список нот в создаваемой программе и т.п.) молча не грузятся.
 *
 * Этот модуль хранит адрес, который реально ответил на пробный запрос —
 * найденный тем же способом, что и useLocalServer, включая mDNS-имя платы,
 * которое работает независимо от того, кто раздаёт сеть.
 */

let resolved: string | null = null;

export function getResolvedBackendOverride(): string | null {
  return resolved;
}

export function setResolvedBackendOverride(url: string | null) {
  resolved = url;
}
