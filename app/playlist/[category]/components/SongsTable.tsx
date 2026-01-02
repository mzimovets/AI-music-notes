// "use client";
// import {
//   Table,
//   TableHeader,
//   TableColumn,
//   TableBody,
//   TableRow,
//   TableCell,
//   Spinner,
// } from "@heroui/react";
// import { useTableCell } from "./useTableCell";
// import { usePlaylistContext } from "../PlaylistContextProvider";

// export const SongsTable = () => {
//   const renderCell = useTableCell();
//   const context = usePlaylistContext();
//   const { songsResponse } = context;
//   const songs = songsResponse?.docs;

//   const columns = [
//     { key: "name", label: "НАЗВАНИЕ" },
//     { key: "author", label: "АВТОР" },
//     { key: "actions", label: "ДЕЙСТВИЕ" },
//   ];

//   return (
//     <Table
//       isStriped
//       isHeaderSticky // Заголовок остается на месте при прокрутке
//       aria-label="Таблица песен"
//       className="mt-4 p-1"
//       classNames={{
//         base: "max-h-[520px] overflow-scroll", // Фиксированная высота со скроллом
//         table: "min-h-[200px]", // Минимальная высота таблицы
//       }}
//       emptyContent={
//         <div className="py-10 text-center">
//           <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               fill="none"
//               viewBox="0 0 24 24"
//               strokeWidth={1.5}
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
//               />
//             </svg>
//           </div>
//           <p className="text-gray-500 text-lg font-medium mb-2">
//             Ничего не найдено
//           </p>
//           <p className="text-gray-400 text-sm">
//             Попробуйте изменить запрос или ввести другие ключевые слова
//           </p>
//         </div>
//       }
//     >
//       <TableHeader columns={columns}>
//         {(column) => (
//           <TableColumn
//             key={column.key}
//             align={column.key === "actions" ? "center" : "start"}
//           >
//             {column.label}
//           </TableColumn>
//         )}
//       </TableHeader>
//       <TableBody
//         items={songs || []}
//         isLoading={!songs}
//         loadingContent={<Spinner label="Загрузка..." />}
//       >
//         {(item) => (
//           <TableRow key={item._id}>
//             {(columnKey) => (
//               <TableCell>{renderCell(item, columnKey)}</TableCell>
//             )}
//           </TableRow>
//         )}
//       </TableBody>
//     </Table>
//   );
// };

"use client";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Input,
} from "@heroui/react";
import { useTableCell } from "./useTableCell";
import { usePlaylistContext } from "../PlaylistContextProvider";
import { useState, useMemo } from "react";
import { SearchIcon } from "@/components/icons"; // Предполагаю, что у вас есть иконка поиска

export const SongsTable = () => {
  const renderCell = useTableCell();
  const context = usePlaylistContext();
  const { songsResponse } = context;
  const songs = songsResponse?.docs;

  // Состояние для поиска
  const [searchValue, setSearchValue] = useState("");

  // Фильтрация песен по поисковому запросу
  const filteredSongs = useMemo(() => {
    if (!songs) return [];

    if (!searchValue.trim()) {
      return songs; // Если поиск пустой, показываем все песни
    }

    const lowerSearch = searchValue.toLowerCase().trim();

    return songs.filter((song) => {
      // Поиск по названию
      const nameMatch = song.name?.toLowerCase().includes(lowerSearch);

      // Поиск по автору
      const authorMatch = song.author?.toLowerCase().includes(lowerSearch);

      // Поиск по категории (если нужно)
      // const categoryMatch = song.category?.toLowerCase().includes(lowerSearch);

      return nameMatch || authorMatch; // || categoryMatch
    });
  }, [songs, searchValue]);

  const columns = [
    { name: "НАЗВАНИЕ", uid: "name", align: "start" },
    { name: "АВТОР", uid: "author", align: "center" },
    { name: "ДЕЙСТВИЯ", uid: "actions", align: "end" },
  ];

  // Обработчик изменения поиска
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  return (
    <div className="space-y-4">
      {/* Поле поиска
      <div className="mb-4">
        <Input
          type="search"
          placeholder="Поиск песен..."
          value={searchValue}
          onChange={handleSearchChange}
          endContent={<SearchIcon className="text-default-400" />}
          className="max-w-md"
          classNames={{
            inputWrapper: "bg-white border border-gray-200 rounded-lg",
            input: "text-sm",
          }}
        />
      </div> */}
      <Table
        isStriped
        isHeaderSticky
        aria-label="Таблица песен"
        className="mt-4 p-1"
        classNames={{
          base: "max-h-[520px] overflow-scroll",
          table: "min-h-[200px]",
        }}
        emptyContent={
          <div className="py-10 text-center">
            <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium mb-2">
              {searchValue
                ? `По запросу "${searchValue}" ничего не найдено`
                : "Ничего не найдено"}
            </p>
            <p className="text-gray-400 text-sm">
              {searchValue
                ? "Попробуйте изменить запрос"
                : "Пока нет песен в этой категории"}
            </p>
          </div>
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.align || "start"}
              className="w-1/3 card-header"
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={filteredSongs || []}
          isLoading={!songs}
          loadingContent={<Spinner label="Загрузка..." />}
        >
          {(item) => (
            <TableRow key={item._id}>
              {(columnKey) => (
                <TableCell>{renderCell(item, columnKey)}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
