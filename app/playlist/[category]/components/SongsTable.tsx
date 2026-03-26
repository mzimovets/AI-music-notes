"use client";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Pagination,
  Card,
  Link,
} from "@heroui/react";
import { useTableCell } from "./useTableCell";
import { usePlaylistContext } from "../PlaylistContextProvider";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SongContextProvider } from "@/app/song/[id]/SongContextProvider";
import { TableEmptyContent } from "./TableEmptyContent";

export const SongsTable = () => {
  const renderCell = useTableCell();
  const router = useRouter();

  const { songsResponse, searchValue } = usePlaylistContext();
  const songs = songsResponse?.docs;

  const filteredSongs = useMemo(() => {
    if (!songs) return [];

    if (!searchValue.trim()) return songs;

    const lowerSearch = searchValue.toLowerCase().trim();

    return songs.filter((song) => {
      const nameMatch = song.name?.toLowerCase().includes(lowerSearch);
      const authorMatch = song.author?.toLowerCase().includes(lowerSearch);
      return nameMatch || authorMatch;
    });
  }, [songs, searchValue]);

  const [page, setPage] = useState(1);
  const rowsPerPage = 6;

  const pages = Math.ceil(filteredSongs.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredSongs.slice(start, end);
  }, [page, filteredSongs]);

  useEffect(() => {
    setPage(1);
  }, [searchValue]);

  const columns = [
    { name: "НАЗВАНИЕ", uid: "name", align: "start" },
    { name: "АВТОР", uid: "author", align: "center" },
    { name: "ДЕЙСТВИЯ", uid: "actions", align: "end" },
  ];

  const pagination =
    pages > 1 ? (
      <Pagination
        page={page}
        total={pages}
        onChange={setPage}
        className="pb-4"
        classNames={{
          wrapper: "font-header",
          item: [
            "font-pagination",
            "text-gray-700",
            "data-[hover=true]:text-white",
            "data-[hover=true]:bg-gradient-to-r",
            "data-[hover=true]:from-[#BD9673]",
            "data-[hover=true]:to-[#7D5E42]",
          ].join(" "),
          cursor: [
            "font-pagination",
            "bg-gradient-to-r from-[#BD9673] to-[#7D5E42]",
            "text-white",
            "font-bold",
          ].join(" "),
        }}
      />
    ) : null;

  return (
    <div className="space-y-4 flex flex-col w-full">
      {/* Десктопная таблица */}
      <div className="hidden md:block w-full overflow-x-auto">
        <Table
          isStriped
          isHeaderSticky
          aria-label="Таблица песен"
          className="mt-4 w-full box-border"
          bottomContent={pagination}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.align}
                className="card-header"
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>

          <TableBody
            items={items}
            isLoading={!songs}
            loadingContent={<Spinner label="Загрузка..." />}
            emptyContent={<TableEmptyContent />}
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

      {/* Мобильные карточки */}
      <div className="block md:hidden space-y-4">
        <Card className="p-4 flex gap-4">
          {items?.map((item) => (
            <Card key={item._id} className="p-4">
              {/* Кликабельный контейнер для названия и автора */}
              <Link href={`/song/${item._id}`} className="block mb-3">
                <div className="flex flex-col gap-1 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors">
                  {/* Название (предположим, что это column.uid = 'name' или 'title') */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Название:
                    </span>
                    <span className="text-sm font-semibold text-right">
                      {renderCell(item, "name") || renderCell(item, "title")}
                    </span>
                  </div>
                  {/* Автор (предположим, что это column.uid = 'author' или 'artist') */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Автор:
                    </span>
                    <span className="text-sm text-right text-gray-700">
                      {renderCell(item, "author") || renderCell(item, "artist")}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Остальные поля с маленькими заголовками */}
              {columns
                .filter(
                  (column) =>
                    !["name", "title", "author", "artist"].includes(column.uid),
                )
                .map((column) => (
                  <div
                    key={column.uid}
                    className="flex justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {column.name}:
                    </span>
                    <span className="text-sm text-right">
                      {renderCell(item, column.uid)}
                    </span>
                  </div>
                ))}
            </Card>
          ))}

          {/* Пагинация для мобильных */}
          <div className="mt-4">{pagination}</div>
        </Card>
      </div>
    </div>
  );

  // return (
  //   <div className="space-y-4 flex flex-col w-full">
  //     <Table
  //       isStriped
  //       isHeaderSticky
  //       aria-label="Таблица песен"
  //       className="mt-4  w-full box-border"
  //       // classNames={{
  //       //   base: "max-h-[520px] overflow-scroll",
  //       //   table: "min-h-[200px]",
  //       // }}
  //       // onRowAction={(key) => {
  //       //   router.push(`/song/${key}`);
  //       // }}
  //       bottomContent={pagination}
  //     >
  //       <TableHeader columns={columns}>
  //         {(column) => (
  //           <TableColumn
  //             key={column.uid}
  //             align={column.align}
  //             className="w-1/3 card-header"
  //           >
  //             {column.name}
  //           </TableColumn>
  //         )}
  //       </TableHeader>

  //       <TableBody
  //         items={items}
  //         isLoading={!songs}
  //         loadingContent={<Spinner label="Загрузка..." />}
  //         emptyContent={<TableEmptyContent />}
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
  //   </div>
  // );
};
