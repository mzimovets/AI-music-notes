// "use client";
// import PrinterIcon from "@/components/PrinterIcon";
// import { useSongContext } from "../SongContextProvider";
// import { useRef, useState } from "react";

// export const PrintSong = () => {
//   const iframeRef = useRef();
//   const context = useSongContext();
//   const [isLoading, setIsLoading] = useState(false);

//   // const handlePrint = () => {
//   //   if (!context?.songResponse?.doc?.file?.filename) return;

//   //   const fileUrl = `http://localhost:4000/uploads/${context.songResponse.doc.file.filename}`;

//   //   // Открываем PDF в новом окне
//   //   const printWindow = window.open(fileUrl, "_blank");

//   //   if (printWindow) {
//   //     setIsLoading(true);

//   //     // Пытаемся напечатать через 1 секунду (после загрузки)
//   //     setTimeout(() => {
//   //       try {
//   //         printWindow.print();
//   //       } catch (error) {
//   //         console.error("Ошибка печати:", error);
//   //         // Если не удалось, оставляем окно открытым для ручной печати
//   //       } finally {
//   //         setIsLoading(false);
//   //       }
//   //     }, 1000);
//   //   } else {
//   //     // Если браузер заблокировал popup
//   //     alert("Пожалуйста, разрешите всплывающие окна для печати");
//   //     // Открываем в новой вкладке
//   //     window.open(fileUrl, "_blank");
//   //   }
//   // };

//   const handlePrint = () => {
//     // 1. Проверка наличия данных (как в вашем первом примере)
//     if (!context?.songResponse?.doc?.file?.filename) return;

//     // 2. Формирование динамического URL
//     const fileUrl = `http://localhost:4000/uploads/${context.songResponse.doc.file.filename}`;

//     if (iframeRef.current) {
//       setIsLoading(true);

//       // 3. Установка src для iframe
//       iframeRef.current.src = fileUrl;

//       // 4. Обработчик события загрузки
//       iframeRef.current.onload = () => {
//         try {
//           iframeRef.current.contentWindow.focus();
//           iframeRef.current.contentWindow.print();
//         } catch (error) {
//           console.error("Ошибка печати:", error);
//         } finally {
//           setIsLoading(false);
//         }
//       };
//     }
//   };

//   return (
//     <>
//       <div style={{ display: "none" }}>
//         <iframe
//           ref={iframeRef}
//           style={{ display: "none" }}
//           title="PDF для печати"
//         />
//       </div>
//       <button
//         onClick={handlePrint}
//         disabled={!context || isLoading}
//         className={`hover:opacity-100 transition-opacity duration-300 group hover:scale-110 transition-transform ${
//           !context || isLoading ? "opacity-50 cursor-not-allowed" : ""
//         }`}
//         title={isLoading ? "Подготовка к печати..." : "Распечатать партитуру"}
//       >
//         <PrinterIcon
//           width={34}
//           height={34}
//           className={isLoading ? "animate-pulse" : ""}
//         />
//       </button>
//     </>
//   );
// };

"use client";
import { useSongContext } from "../SongContextProvider";
import { useRef, useState, useCallback } from "react";

export const usePrintSong = () => {
  const context = useSongContext();
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef(null);

  const handlePrint = useCallback(() => {
    const filename = context?.songResponse?.doc?.file?.filename;
    if (!filename) return;

    const fileUrl = `http://localhost:4000/uploads/${filename}`;

    if (iframeRef.current) {
      setIsLoading(true);

      // Сбрасываем src для корректного срабатывания onload при повторном нажатии
      iframeRef.current.src = "";

      iframeRef.current.onload = () => {
        try {
          const iframeWindow = iframeRef.current.contentWindow;
          if (iframeWindow) {
            iframeWindow.focus();
            iframeWindow.print();
          }
        } catch (error) {
          console.error("Ошибка печати:", error);
          alert("Ошибка доступа к печати (CORS). Проверьте настройки сервера.");
        } finally {
          setIsLoading(false);
        }
      };

      iframeRef.current.src = fileUrl;
    }
  }, [context]);

  return {
    handlePrint,
    isLoading,
    isEnabled: !!context?.songResponse,
    PrintElement: (
      <iframe
        ref={iframeRef}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          border: 0,
          visibility: "hidden",
        }}
        title="PDF Print Frame"
      />
    ),
  };
};
