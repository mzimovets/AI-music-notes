"use client";
import ShareIcon from "@/components/ShareIcon";
import { useSongContext } from "../SongContextProvider";

export const ShareSong = () => {
  const context = useSongContext();

  const handleShare = async () => {
    if (!context?.songResponse) return;

    const song = context.songResponse;
    const fileUrl = `http://localhost:4000/uploads/${song.doc.file.filename}`;
    const fileName = song.doc.file.filename || `${song.doc.name}.pdf`;
    const songInfo = `${song.doc.author ? `${song.doc.author} - ` : ""}${song.doc.name}`;

    // Определяем, мобильное устройство или десктоп
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      // Для мобильных с Web Share API
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: "application/pdf" });

        // Пытаемся передать файл
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: song.doc.name,
            text: song.doc.author || "",
          });
          return;
        }
      } catch (error) {
        console.log("Не удалось передать файл, пробуем текст со ссылкой");
      }

      // Fallback: отправляем текст со ссылкой
      const shareText = `${songInfo}\n\nСкачать: ${fileUrl}`;
      await navigator.share({
        title: "Партитура",
        text: shareText,
        url: fileUrl,
      });
    } else {
      // Для десктопных браузеров или когда Web Share API недоступен

      // Прямые ссылки для популярных мессенджеров
      const shareData = {
        telegram: `https://t.me/share/url?url=${encodeURIComponent(fileUrl)}&text=${encodeURIComponent(songInfo)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`${songInfo}\n${fileUrl}`)}`,
        email: `mailto:?subject=${encodeURIComponent(songInfo)}&body=${encodeURIComponent(`${songInfo}\n\nСсылка для скачивания:\n${fileUrl}`)}`,
      };

      // Показываем меню выбора или открываем Telegram по умолчанию
      if (
        window.confirm(
          `Поделиться партитурой "${songInfo}"?\n\nОткрыть в Telegram для отправки?`
        )
      ) {
        window.open(shareData.telegram, "_blank", "noopener,noreferrer");
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform"
      title={`Поделиться файлом${context?.songResponse ? `: ${context.songResponse.doc.name}` : ""}`}
      disabled={!context}
    >
      <ShareIcon
        className={`${context ? "group-hover:text-gray-400" : "text-gray-400"} transition-colors duration-300`}
        width={34}
        height={34}
      />
    </button>
  );
};
