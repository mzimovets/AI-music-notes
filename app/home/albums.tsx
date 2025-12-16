// "use client";

// import { Card } from "@heroui/react";
// import { use, useContext } from "react";
// import { SongsLibraryContext } from "../providers";
// import { useRouter } from "next/navigation";

// export default function Albums() {
//   const context = useContext(SongsLibraryContext) || {};
//   const albums = use(context.albumsPromise);
//   const router = useRouter();

//   return (
//     <div style={{ display: "flex", gap: "18px" }}>
//       {albums?.docs.map((post: { name: string; title: string }) => (
//         <div key={post.name} className="flex flex-col items-center">
//           <Card
//             onPress={() => router.push("/playlist")}
//             isPressable
//             className="w-40 h-40"
//           ></Card>
//           <p className="mt-2 card-header">{post.name}</p>{" "}
//           {/* Подпись снизу с отступом */}
//         </div>
//       ))}
//     </div>
//   );
// }

// ЭТО СДЕЛАЛА ИИ!

"use client";

import { Card } from "@heroui/react";
import { use, useContext } from "react";
import { SongsLibraryContext } from "../providers";
import { useRouter } from "next/navigation";

export default function Albums() {
  const context = useContext(SongsLibraryContext) || {};
  const albums = use(context.albumsPromise);
  const router = useRouter();

  // Проверяем данные перед рендерингом
  if (!albums?.docs?.length) {
    return <div>Нет альбомов</div>;
  }

  return (
    <div style={{ display: "flex", gap: "18px" }}>
      {albums.docs.map(
        (
          post: { name: string; title: string; _id?: string },
          index: number
        ) => {
          // Создаем уникальный ключ
          const uniqueKey = post._id || post.name || `album-${index}`;

          return (
            <div key={uniqueKey} className="flex flex-col items-center">
              <Card
                onPress={() => router.push("/playlist")}
                isPressable
                className="w-40 h-40"
              ></Card>
              <p className="mt-2 card-header">
                {post.name || `Альбом ${index + 1}`}
              </p>
            </div>
          );
        }
      )}
    </div>
  );
}
