"use client";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { useTableCell } from "./useTableCell";
import { usePlaylistContext } from "../PlaylistContextProvider";

export const SongsTable = () => {
  const renderCell = useTableCell();

  const context = usePlaylistContext();
  const { songsResponse } = context;
  const songs = songsResponse?.docs;

  const columns = [
    // Добавить еще автора слов (Слова: Маршака)
    // Разбить колонки на обработка, аранжировка
    { name: "НАЗВАНИЕ", uid: "name" },
    { name: "АВТОР", uid: "author" },
    { name: "ДЕЙСТВИЕ", uid: "actions" },
  ];

  return (
    <div>
      <Table aria-label="Example table with custom cells" className="mt-4">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={column.uid === "actions" ? "center" : "start"}
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={songs || []}>
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
