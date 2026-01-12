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
} from "@heroui/react";
import { useTableCell } from "./useTableCell";
import { usePlaylistContext } from "../PlaylistContextProvider";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <div className="space-y-4">
      <Table
        isStriped
        isHeaderSticky
        // selectionMode="single"
        aria-label="Таблица песен"
        className="mt-4 p-1 w-full box-border" //как оставить отступы, но чтобы при этом ширина совпадала?
        classNames={{
          base: "max-h-[520px] overflow-scroll",
          table: "min-h-[200px]",
        }}
        onRowAction={(key) => {
          router.push(`/song/${key}`);
        }}
        bottomContent={
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
          ) : null
        }
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.align}
              className="w-1/3 card-header"
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>

        <TableBody
          items={items}
          isLoading={!songs}
          loadingContent={<Spinner label="Загрузка..." />}
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
                Ничего не найдено
              </p>
              <p className="text-gray-400 text-sm">
                Попробуйте изменить запрос или ввести другие ключевые слова
              </p>
            </div>
          }
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
