import { useMemo, useState } from "react";
import {
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";

import { SearchTableCell } from "./SearchTableCell";
import { columns } from "./columns";
import { paginationClassnames } from "./constants";

import { EmptyIcon } from "@/components/icons/EmptyIcon";

export const SearchTable = ({ filteredSongs }) => {
  const [page, setPage] = useState(1);
  const rowsPerPage = 4;

  const pages = Math.ceil(filteredSongs.length / rowsPerPage);

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredSongs.slice(start, end);
  }, [page, filteredSongs, rowsPerPage]);

  return (
    <Table
      isStriped
      aria-label="Example table with custom cells"
      bottomContent={
        pages > 1 ? (
          <Pagination
            className="pb-4"
            classNames={paginationClassnames}
            page={page}
            total={pages}
            onChange={(page) => setPage(page)}
          />
        ) : null
      }
      className="mt-4 w-150 m-3 bg-white rounded-lg shadow-xl p-1"
    >
      <TableHeader columns={columns}>
        {(column) => (
          <TableColumn
            key={column.uid}
            align={column.align || "start"}
            className="w-1/3"
          >
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent={
          <div className="py-10 text-center">
            <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
              <EmptyIcon />
            </div>
            <p className="text-gray-500 text-lg font-medium mb-2">
              Ничего не найдено
            </p>
            <p className="text-gray-400 text-sm">Попробуйте изменить запрос</p>
          </div>
        }
        items={items}
      >
        {(item) => (
          <TableRow key={item._id}>
            {(columnKey) => (
              <TableCell>
                <SearchTableCell columnKey={columnKey} song={item} />
              </TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
