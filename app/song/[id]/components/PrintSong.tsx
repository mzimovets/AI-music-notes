"use client";
import PrinterIcon from "@/components/PrinterIcon";
import { useSongContext } from "../SongContextProvider";
import { useState } from "react";

export const PrintSong = () => {
  const context = useSongContext();
  const [isLoading, setIsLoading] = useState(false);

  const handlePrint = () => {
    if (!context?.songResponse?.doc?.file?.filename) return;

    const fileUrl = `http://localhost:4000/uploads/${context.songResponse.doc.file.filename}`;

    // Открываем PDF в новом окне
    const printWindow = window.open(fileUrl, "_blank");

    if (printWindow) {
      setIsLoading(true);

      // Пытаемся напечатать через 1 секунду (после загрузки)
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (error) {
          console.error("Ошибка печати:", error);
          // Если не удалось, оставляем окно открытым для ручной печати
        } finally {
          setIsLoading(false);
        }
      }, 1000);
    } else {
      // Если браузер заблокировал popup
      alert("Пожалуйста, разрешите всплывающие окна для печати");
      // Открываем в новой вкладке
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={!context || isLoading}
      className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
        !context || isLoading ? "opacity-50 cursor-not-allowed" : ""
      }`}
      title={isLoading ? "Подготовка к печати..." : "Распечатать партитуру"}
    >
      <PrinterIcon
        width={34}
        height={34}
        className={isLoading ? "animate-pulse" : ""}
      />
    </button>
  );
};
