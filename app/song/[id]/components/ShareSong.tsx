"use client";
import { useSongContext } from "../SongContextProvider";

export const useShareSong = () => {
  // Пытаемся получить контекст, но не падаем, если его нет
  const context = useSongContext();

  const handleShare = async (manualSongData = null) => {
    // 1. Сначала ищем данные в аргументе (для таблицы),
    //    затем в контексте (для страницы песни)
    const song = manualSongData || context?.songResponse;

    if (!song) return;

    // 2. Универсальный поиск данных:
    //    в контексте файл лежит в doc.file, а в таблице — напрямую в file
    const file = song.doc?.file || song.file;
    const name = song.doc?.name || song.name || "Партитура";

    if (!file?.filename) {
      console.warn("Файл не найден в структуре:", song);
      return;
    }

    const fileUrl = `http://localhost:4000/uploads/${file.filename}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: name, url: fileUrl });
      } else {
        alert("Ссылка: " + fileUrl);
      }
    } catch (error) {
      console.error("Ошибка Share:", error);
    }
  };

  return { handleShare };
};
