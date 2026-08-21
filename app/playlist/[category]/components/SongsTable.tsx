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
} from "@heroui/react";
import { useTableCell } from "./useTableCell";
import { usePlaylistContext } from "../PlaylistContextProvider";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";

// Примерные высоты элементов в пикселях
const DESKTOP_ROW_H = 52;   // строка таблицы
const DESKTOP_HDR_H = 43;   // заголовок столбцов
const MOBILE_ROW_H  = 108;  // карточка песни
const PAGINATION_H  = 56;   // блок пагинации
const BOTTOM_GAP    = 8;    // отступ снизу

export const SongsTable = () => {
  const renderCell = useTableCell();
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";

  const { songsResponse, searchValue } = usePlaylistContext();
  const songs = songsResponse?.docs;

  const filteredSongs = useMemo(() => {
    if (!songs) return [];
    const sorted = [...songs].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "ru", { sensitivity: "base" })
    );
    if (!searchValue.trim()) return sorted;
    const norm = (s: string) => s.normalize("NFC").toLowerCase();
    const q = norm(searchValue).trim();
    return sorted.filter(
      (s) =>
        (s.name && norm(s.name).includes(q)) ||
        (s.author && norm(s.author).includes(q))
    );
  }, [songs, searchValue]);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Телефон отличаем один раз и следим за поворотом.
   *
   * На телефоне список идёт вниз обычной прокруткой, а не разбивается на
   * страницы: свободной высоты там хватало ровно на одну песню, и листать
   * приходилось по одной — пользоваться этим невозможно.
   */
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // Прокрутку страницы запрещаем только там, где список разбит на страницы.
  // На телефоне она и есть способ листать список
  useEffect(() => {
    if (isMobile) return;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isMobile]);

  // Пересчёт количества строк исходя из доступной высоты
  const recalc = useCallback(() => {
    if (!containerRef.current) return;
    const top = containerRef.current.getBoundingClientRect().top;
    const available = window.innerHeight - top - BOTTOM_GAP;
    const isDesktop = window.innerWidth >= 768;

    let rows: number;
    if (isDesktop) {
      rows = Math.max(
        1,
        Math.floor((available - DESKTOP_HDR_H - PAGINATION_H) / DESKTOP_ROW_H)
      );
    } else {
      rows = Math.max(1, Math.floor((available - PAGINATION_H) / MOBILE_ROW_H));
    }
    setRowsPerPage(rows);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(recalc);
    const onResize = () => recalc();
    // orientationchange срабатывает ДО обновления размеров — даём 150мс
    const onOrientation = () => setTimeout(recalc, 150);

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [recalc]);

  // При смене ориентации/размера сбрасываем на первую страницу
  useEffect(() => { setPage(1); }, [rowsPerPage]);
  useEffect(() => { setPage(1); }, [searchValue]);

  const pages = Math.ceil(filteredSongs.length / rowsPerPage);

  const items = useMemo(() => {
    // На телефоне отдаём список целиком — разбивать его на страницы незачем
    if (isMobile) return filteredSongs;
    const start = (page - 1) * rowsPerPage;
    return filteredSongs.slice(start, start + rowsPerPage);
  }, [page, filteredSongs, rowsPerPage, isMobile]);

  const allColumns = [
    { name: "НАЗВАНИЕ", uid: "name", align: "start" as const },
    { name: "АВТОР",    uid: "author", align: "center" as const },
    { name: "ДЕЙСТВИЯ", uid: "actions", align: "end" as const },
  ];
  const columns = isRegent
    ? allColumns
    : allColumns.filter((c) => c.uid !== "actions");

  const emptyContent = (
    <div className="py-10 text-center">
      <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      </div>
      <p className="text-gray-500 text-lg font-medium mb-2">Ничего не найдено</p>
      <p className="text-gray-400 text-sm">Попробуйте изменить запрос</p>
    </div>
  );

  const pagination =
    pages > 1 && !isMobile ? (
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
    <div ref={containerRef} className="flex flex-col w-full">
      {/* Десктопная таблица (md+) */}
      <div className="hidden md:block w-full overflow-x-auto">
        <Table
          isStriped
          aria-label="Таблица песен"
          className="mt-4 w-full box-border"
          bottomContent={pagination}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.uid} align={column.align} className="card-header">
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={items}
            isLoading={!songs}
            loadingContent={<Spinner label="Загрузка..." />}
            emptyContent={emptyContent}
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
      <div className="block md:hidden space-y-3">
        {items?.map((item) => (
          <Card key={item._id} className="p-4">
            {columns.map((column) => (
              <div
                key={column.uid}
                className="flex justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm font-medium text-gray-500">{column.name}:</span>
                <span className="text-sm text-right">{renderCell(item, column.uid)}</span>
              </div>
            ))}
          </Card>
        ))}
        <div className="mt-4">{pagination}</div>
      </div>
    </div>
  );
};
