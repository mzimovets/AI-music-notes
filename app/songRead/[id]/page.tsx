// "use client";

// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";

// import { CloseReadButton } from "./components/CloseReadButton";

// import { StackViewer } from "@/app/stackView/[id]/components/StackViewer";
// import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
// import { getSongById } from "@/lib/utils";

// export default function SongReadPage() {
//   const { id } = useParams<{ id: string }>();

//   const [song, setSong] = useState<any>(null);

//   const [showButton, setShowButton] = useState(true);

//   const [lastScrollY, setLastScrollY] = useState(0);

//   useEffect(() => {
//     const fetchSong = async () => {
//       if (!id) return;

//       const data = await getSongById(id);

//       setSong(data);
//     };

//     fetchSong();
//   }, [id]);

//   // Скрытие кнопки при скролле

//   useEffect(() => {
//     const onScroll = () => {
//       const currentY = window.scrollY;

//       if (currentY < lastScrollY) {
//         // прокрутка вверх — показать кнопку

//         setShowButton(true);
//       } else if (currentY > lastScrollY) {
//         // прокрутка вниз — скрыть кнопку

//         setShowButton(false);
//       }

//       setLastScrollY(currentY);
//     };

//     window.addEventListener("scroll", onScroll, { passive: true });

//     return () => window.removeEventListener("scroll", onScroll);
//   }, [lastScrollY]);

//   if (!song?.doc?.file?.filename) return null;

//   return (
//     <div>
//       <ScrollToTop />

//       <div
//         className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-200
//           ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
//         `}
//       >
//         <CloseReadButton />
//       </div>

//       <div className="flex justify-center mb-2">
//         <StackViewer
//           fileUrl={`${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${song.doc.file.filename}`}
//         />
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { CloseReadButton } from "./components/CloseReadButton";
import { StackViewer } from "@/app/stackView/[id]/components/StackViewer";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { getSongById } from "@/lib/utils";

export default function SongReadPage() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<any>(null);
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Загрузка данных песни
  useEffect(() => {
    const fetchSong = async () => {
      if (!id) return;
      const data = await getSongById(id);
      setSong(data);
    };
    fetchSong();
  }, [id]);

  // Логика скрытия кнопки при скролле
  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < lastScrollY) {
        setShowButton(true);
      } else if (currentY > lastScrollY) {
        setShowButton(false);
      }
      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  // Логика навигации по клавишам U (вверх) и D (вниз) по якорям страниц
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем, если фокус в поле ввода
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const key = e.key.toLowerCase();
      if (key !== "u" && key !== "d") return;

      // Находим все элементы страниц.
      // Селектор подбирается под структуру StackViewer (обычно это canvas или div с номером страницы)
      const pages = Array.from(
        document.querySelectorAll(
          ".react-pdf__Page, [data-page-number], .pdf-page, canvas",
        ),
      );

      if (pages.length === 0) return;

      if (key === "d") {
        // Ищем ПЕРВУЮ страницу, чей верхний край ниже текущего положения экрана хотя бы на 20px
        const nextTarget = pages.find((page) => {
          const rect = page.getBoundingClientRect();
          return rect.top > 20;
        });

        if (nextTarget) {
          nextTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (key === "u") {
        // Ищем ПОСЛЕДНЮЮ страницу, чей верхний край выше текущего экрана (скрыт сверху)
        const prevTarget = [...pages].reverse().find((page) => {
          const rect = page.getBoundingClientRect();
          return rect.top < -20;
        });

        if (prevTarget) {
          prevTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!song?.doc?.file?.filename) return null;

  return (
    <div className="relative min-h-screen">
      <ScrollToTop />

      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-300
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseReadButton />
      </div>

      <div className="flex justify-center mb-2">
        <StackViewer
          fileUrl={`${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/uploads/${song.doc.file.filename}`}
        />
      </div>
    </div>
  );
}
