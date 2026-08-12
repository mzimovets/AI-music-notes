/**
 * Защита от эха при синхронизации программы между регентами.
 *
 * Отправка изменений висит на изменении состава программы, а приход события по
 * сети записывает состав в то же самое состояние. Поэтому клиент, получивший
 * чужое изменение, тут же отправлял его обратно. Пока регент один, это никому
 * не мешало. Как только их становится двое — неважно, две учётные записи или
 * одна на двух устройствах, — они зацикливаются: каждый отвечает на изменение
 * собеседника своим, и порядок песен начинает дёргаться туда-сюда без конца.
 *
 * Здесь запоминается последнее состояние, пришедшее по сети. Отправка его же
 * обратно пропускается: она ничего не меняет и нужна только циклу.
 */
let lastRemote: string | null = null;

const serialize = (songs: unknown, mealType: unknown) =>
  JSON.stringify({ songs, mealType });

export function markStackFromRemote(songs: unknown, mealType: unknown) {
  lastRemote = serialize(songs, mealType);
}

export function isStackEcho(songs: unknown, mealType: unknown) {
  return lastRemote !== null && lastRemote === serialize(songs, mealType);
}
