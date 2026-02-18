import { EmptyIcon } from "@/components/icons/EmptyIcon";
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
import { useMemo, useState } from "react";
import { paginationClassnames } from "./constants";

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
      className="mt-4 w-150 m-3 bg-white rounded-lg shadow-xl p-1"
      bottomContent={
        pages > 1 ? (
          <Pagination
            onChange={(page) => setPage(page)}
            total={pages}
            page={page}
            className="pb-4"
            classNames={paginationClassnames}
          />
        ) : null
      }
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
        items={items}
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
      >
        {(item) => (
          <TableRow key={item._id}>
            {(columnKey) => (
              <TableCell>
                <SearchTableCell song={item} columnKey={columnKey} />
              </TableCell>
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
