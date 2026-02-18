// // "use client";

// // import { Card, ScrollShadow, Button } from "@heroui/react";
// // import { useContext, useRef } from "react";
// // import { SongsLibraryContext } from "../providers";
// // import { useRouter } from "next/navigation";
// // import { categorySongs } from "@/components/constants";
// // import SwarrowIcon, { SwarrowIconWithCircle } from "@/components/swarrow";

// // export default function Albums() {
// //   const context = useContext(SongsLibraryContext) || {};
// //   const router = useRouter();
// //   const scrollContainerRef = useRef<HTMLDivElement>(null);

// //   // Функция для прокрутки влево
// //   const scrollLeft = () => {
// //     if (scrollContainerRef.current) {
// //       scrollContainerRef.current.scrollBy({
// //         left: -300, // Прокручиваем на ширину примерно 2 карточек
// //         behavior: "smooth",
// //       });
// //     }
// //   };

// //   // Функция для прокрутки вправо
// //   const scrollRight = () => {
// //     if (scrollContainerRef.current) {
// //       scrollContainerRef.current.scrollBy({
// //         left: 300,
// //         behavior: "smooth",
// //       });
// //     }
// //   };

// //   return (
// //     <div className="w-full max-w-6xl mx-auto px-4">
// //       <div className="w-full flex justify-start ml-33 mb-4">
// //         <div className="flex gap-4">
// //           <button
// //             onClick={scrollLeft}
// //             className="cursor-pointer p-2 hover:opacity-80 transition-opacity"
// //             title="Предыдущие"
// //           >
// //             <SwarrowIconWithCircle width={50} height={13} circleSize={20} />
// //           </button>
// //           <button
// //             onClick={scrollRight}
// //             className="cursor-pointer p-2 hover:opacity-80 transition-opacity"
// //             title="Следующие"
// //           >
// //             <SwarrowIconWithCircle
// //               width={50}
// //               height={13}
// //               circleSize={20}
// //               className="rotate-180"
// //             />
// //           </button>
// //           <Button radius="full" isIconOnly>
// //             -
// //           </Button>
// //         </div>
// //       </div>
// //       <ScrollShadow
// //         hideScrollBar
// //         className="w-full w-[800px] mx-auto"
// //         orientation="horizontal"
// //         size={30}
// //         offset={20}
// //       >
// //         <div
// //           ref={scrollContainerRef}
// //           className="flex gap-6 pb-4  w-[799px]" //если убрать overflow-x-auto, то появится тень!!!
// //           style={{
// //             scrollbarWidth: "thin",
// //             scrollBehavior: "smooth",
// //           }}
// //         >
// //           {categorySongs.map(
// //             (
// //               post: { key: string; name: string; image: string },
// //               index: number
// //             ) => (
// //               <div
// //                 key={post.key}
// //                 className="flex-shrink-0 flex flex-col items-center"
// //               >
// //                 <Card
// //                   onPress={() => router.push(`/playlist/${post.key}`)}
// //                   isPressable
// //                   className="w-40 h-40 rounded-xl shadow-lg"
// //                 ></Card>
// //                 <p className="mt-3 text-center font-medium text-sm md:text-base card-header">
// //                   {post.name || `Альбом ${index + 1}`}
// //                 </p>
// //               </div>
// //             )
// //           )}
// //         </div>
// //       </ScrollShadow>
// //     </div>
// //   );
// // }

// "use client";

// import { Card, ScrollShadow, Button } from "@heroui/react";
// import { useContext, useRef, useEffect, useState } from "react";
// import { SongsLibraryContext } from "../providers";
// import { useRouter } from "next/navigation";
// import { categorySongs } from "@/components/constants";
// import SwarrowIcon, { SwarrowIconWithCircle } from "@/components/swarrow";

// export default function Albums() {
//   const context = useContext(SongsLibraryContext) || {};
//   const router = useRouter();
//   const scrollContainerRef = useRef<HTMLDivElement>(null);
//   const [showLeftArrow, setShowLeftArrow] = useState(false);
//   const [showRightArrow, setShowRightArrow] = useState(true);

//   const scrollLeft = () => {
//     if (scrollContainerRef.current) {
//       scrollContainerRef.current.scrollBy({
//         left: -300,
//         behavior: "smooth",
//       });
//     }
//   };

//   const scrollRight = () => {
//     if (scrollContainerRef.current) {
//       scrollContainerRef.current.scrollBy({
//         left: 300,
//         behavior: "smooth",
//       });
//     }
//   };

//   const checkScroll = () => {
//     if (scrollContainerRef.current) {
//       const { scrollLeft, scrollWidth, clientWidth } =
//         scrollContainerRef.current;
//       setShowLeftArrow(scrollLeft > 0);
//       setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
//     }
//   };

//   useEffect(() => {
//     const container = scrollContainerRef.current;
//     if (container) {
//       container.addEventListener("scroll", checkScroll);
//       checkScroll();
//     }

//     return () => {
//       if (container) {
//         container.removeEventListener("scroll", checkScroll);
//       }
//     };
//   }, []);

//   return (
//     <div className="w-full max-w-6xl mx-auto px-4 overflow-hidden bg-[#F7F4F1]">
//       <div className="w-full flex justify-start ml-33 mb-4">
//         <div className="flex gap-4">
//           <button
//             onClick={scrollLeft}
//             className={`cursor-pointer p-2 transition-opacity ${
//               showLeftArrow
//                 ? "opacity-100 hover:opacity-80"
//                 : "opacity-30 cursor-not-allowed"
//             }`}
//             title="Предыдущие"
//             disabled={!showLeftArrow}
//           >
//             <SwarrowIconWithCircle width={50} height={13} circleSize={20} />
//           </button>
//           <button
//             onClick={scrollRight}
//             className={`cursor-pointer p-2 transition-opacity ${
//               showRightArrow
//                 ? "opacity-100 hover:opacity-80"
//                 : "opacity-30 cursor-not-allowed"
//             }`}
//             title="Следующие"
//             disabled={!showRightArrow}
//           >
//             <SwarrowIconWithCircle
//               width={50}
//               height={13}
//               circleSize={20}
//               className="rotate-180"
//             />
//           </button>
//           <Button radius="full" isIconOnly>
//             -
//           </Button>
//         </div>
//       </div>

//       {/* Контейнер с градиентами цвета фона #F7F4F1 */}
//       <div className="relative">
//         {/* Левый градиент: #F7F4F1 → прозрачный */}
//         <div className="absolute left-0 top-0 bottom-0 w-48 z-10 pointer-events-none">
//           <div
//             className="w-full h-full"
//             style={{
//               background:
//                 "linear-gradient(90deg, #F7F4F1 0%, rgba(247, 244, 241, 0.9) 25%, rgba(247, 244, 241, 0.6) 50%, rgba(247, 244, 241, 0.3) 75%, transparent 100%)",
//             }}
//           ></div>
//         </div>

//         {/* Правый градиент: #F7F4F1 → прозрачный */}
//         <div className="absolute right-0 top-0 bottom-0 w-48 z-10 pointer-events-none">
//           <div
//             className="w-full h-full"
//             style={{
//               background:
//                 "linear-gradient(270deg, #F7F4F1 0%, rgba(247, 244, 241, 0.9) 25%, rgba(247, 244, 241, 0.6) 50%, rgba(247, 244, 241, 0.3) 75%, transparent 100%)",
//             }}
//           ></div>
//         </div>

//         {/* Скролл контейнер */}
//         <div className="relative overflow-x-auto overflow-y-visible">
//           <div
//             ref={scrollContainerRef}
//             className="flex gap-6 pb-4"
//             style={{
//               scrollbarWidth: "thin",
//               scrollBehavior: "smooth",
//               paddingLeft: "192px", // 192px = 12rem (48px * 4)
//               paddingRight: "192px",
//             }}
//           >
//             {categorySongs.map(
//               (
//                 post: { key: string; name: string; image: string },
//                 index: number
//               ) => (
//                 <div
//                   key={post.key}
//                   className="flex-shrink-0 flex flex-col items-center"
//                 >
//                   <Card
//                     onPress={() => router.push(`/playlist/${post.key}`)}
//                     isPressable
//                     className="w-40 h-40 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
//                   >
//                     <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
//                       {post.image ? (
//                         <img
//                           src={post.image}
//                           alt={post.name}
//                           className="w-full h-full object-cover rounded-xl"
//                         />
//                       ) : (
//                         <span className="text-gray-400">
//                           {post.name.charAt(0)}
//                         </span>
//                       )}
//                     </div>
//                   </Card>
//                   <p className="mt-3 text-center font-medium text-sm md:text-base card-header">
//                     {post.name || `Альбом ${index + 1}`}
//                   </p>
//                 </div>
//               )
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { Card, Button } from "@heroui/react";
import { useContext } from "react";
import { SongsLibraryContext } from "../providers";
import { useRouter } from "next/navigation";
import { categorySongs } from "@/components/constants";

export default function Albums() {
  const context = useContext(SongsLibraryContext) || {};
  const router = useRouter();

  return (
    <div className="w-auto bg-[#F7F4F1]">
      <div className="px-4 m-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
          {categorySongs.map((post) => (
            <div key={post.key} className="flex flex-col items-center w-full">
              <Card
                onPress={() => router.push(`/playlist/${post.key}`)}
                isPressable
                className="w-50 h-50  rounded-xl shadow-md hover:shadow-lg transition-shadow"
              ></Card>

              <p className="mt-2 text-center font-medium text-xs sm:text-sm card-header line-clamp-2 max-w-[140px]">
                {post.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
