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
import { useSongContext } from "@/app/song/[id]/SongContextProvider";
import { ServerSong } from "@/lib/types";
import { useRef, useState, useCallback } from "react";

export const usePrintSong = () => {
  const context = useSongContext();
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  

  const handlePrint = useCallback(
    (song?: ServerSong) => {
      const filename =
        context?.songResponse?.doc?.file?.filename || song?.file?.filename;
      console.log("handlePrint", filename, iframeRef.current);
      if (!filename) return;

      if (iframeRef.current) {
        setIsLoading(true);
        const iframeEl = iframeRef.current;
        const printFilename = filename;

        // Сбрасываем src для корректного срабатывания onload при повторном нажатии.
        // В проде доступ к `contentWindow` может блокироваться браузером для кросс-ориджных фреймов,
        // поэтому печать делаем на стороне дочерней страницы.
        iframeEl.src = "";

        const onMessage = (event: MessageEvent) => {
          if (event.data?.type === "print:after" && event.data?.filename === printFilename) {
            setIsLoading(false);
            window.removeEventListener("message", onMessage);
          }
        };

        window.addEventListener("message", onMessage);
        const timeoutId = window.setTimeout(() => {
          setIsLoading(false);
          window.removeEventListener("message", onMessage);
        }, 12000);

        iframeRef.current.src = "";

        iframeRef.current.onload = () => {
          // Очищаем timeout, если дочерняя страница уже загрузилась.
          // Печать выполняется внутри `/print/[filename]`.
          window.clearTimeout(timeoutId);
          window.removeEventListener("message", onMessage);
          setTimeout(() => setIsLoading(false), 1500);
        };

        iframeRef.current.src = `/print/${encodeURIComponent(filename)}`;
      }
    },
    [context],
  );

  return {
    handlePrint,
    isLoading,
    isEnabled: !!context?.songResponse,
    PrintElement: (
      <iframe
        ref={iframeRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: "0",
          width: "1px",
          height: "1px",
          border: 0,
          visibility: "visible",
        }}
        title="PDF Print Frame"
      />
    ),
  };
};
