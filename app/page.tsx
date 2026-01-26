"use client";
import ModalAddScore, { songs } from "./home/modalAddScore";
import { Suspense, useEffect, useState, useRef } from "react";

import React from "react";
import { getCategoryDisplay, getData } from "@/lib/utils";
import Albums from "./home/albums";
import { SongsLibraryContextProvider } from "./providers";

import { Input, Tooltip, Chip, User, Pagination, Link } from "@heroui/react";
import { Skeleton } from "@heroui/skeleton";
import { SearchIcon } from "@/components/icons";
import { Monogram } from "@/components/monogram";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { motion, AnimatePresence } from "framer-motion";

export const EyeIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 20 20"
      width="1em"
      {...props}
    >
      <path
        d="M12.9833 10C12.9833 11.65 11.65 12.9833 10 12.9833C8.35 12.9833 7.01666 11.65 7.01666 10C7.01666 8.35 8.35 7.01666 10 7.01666C11.65 7.01666 12.9833 8.35 12.9833 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M9.99999 16.8916C12.9417 16.8916 15.6833 15.1583 17.5917 12.1583C18.3417 10.9833 18.3417 9.00831 17.5917 7.83331C15.6833 4.83331 12.9417 3.09998 9.99999 3.09998C7.05833 3.09998 4.31666 4.83331 2.40833 7.83331C1.65833 9.00831 1.65833 10.9833 2.40833 12.1583C4.31666 15.1583 7.05833 16.8916 9.99999 16.8916Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const DeleteIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 20 20"
      width="1em"
      {...props}
    >
      <path
        d="M17.5 4.98332C14.725 4.70832 11.9333 4.56665 9.15 4.56665C7.5 4.56665 5.85 4.64998 4.2 4.81665L2.5 4.98332"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M7.08331 4.14169L7.26665 3.05002C7.39998 2.25835 7.49998 1.66669 8.90831 1.66669H11.0916C12.5 1.66669 12.6083 2.29169 12.7333 3.05835L12.9166 4.14169"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M15.7084 7.61664L15.1667 16.0083C15.075 17.3166 15 18.3333 12.675 18.3333H7.32502C5.00002 18.3333 4.92502 17.3166 4.83335 16.0083L4.29169 7.61664"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M8.60834 13.75H11.3833"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M7.91669 10.4167H12.0834"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const EditIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 20 20"
      width="1em"
      {...props}
    >
      <path
        d="M11.05 3.00002L4.20835 10.2417C3.95002 10.5167 3.70002 11.0584 3.65002 11.4334L3.34169 14.1334C3.23335 15.1084 3.93335 15.775 4.90002 15.6084L7.58335 15.15C7.95835 15.0834 8.48335 14.8084 8.74168 14.525L15.5834 7.28335C16.7667 6.03335 17.3 4.60835 15.4583 2.86668C13.625 1.14168 12.2334 1.75002 11.05 3.00002Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
      <path
        d="M9.90833 4.20831C10.2667 6.50831 12.1333 8.26665 14.45 8.49998"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
      <path
        d="M2.5 18.3333H17.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const columns = [
  { name: "НАЗВАНИЕ", uid: "name", align: "start" },
  { name: "АВТОР", uid: "role", align: "center" },
  { name: "ДЕЙСТВИЯ", uid: "actions", align: "end" },
];

export default function Home() {
  const albumsPromise = new Promise((resolve) => resolve(null)); //getData();
  const [allSongs, setAllSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const tableRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showTable &&
        tableRef.current &&
        !tableRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowTable(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTable]);

  useEffect(() => {
    const fetchAllSongs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("http://localhost:4000/songs");
        const data = await response.json();

        if (data.status === "ok" && data.docs) {
          const songs = data.docs
            .filter((song) => song.docType === "song")
            .map((song) => ({
              _id: song._id,
              name: song.doc?.name || song.name || "",
              author: song.doc?.author || song.author || "",
              authorLyrics: song.doc?.authorLyrics || song.authorLyrics || "",
              authorArrange:
                song.doc?.authorArrange || song.authorArrange || "",
              category: song.doc?.category || song.category || "",
              file: song.doc?.file || song.file || {},
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "ru"));

          setAllSongs(songs);
          setFilteredSongs(songs);
        }
      } catch (error) {
        console.error("Ошибка при загрузке песен:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllSongs();
  }, []);

  const searchSongs = (searchText) => {
    if (!searchText.trim()) {
      setFilteredSongs(allSongs);
      return;
    }

    const lowerSearch = searchText.toLowerCase().trim();

    const results = allSongs.filter((song) => {
      const nameMatch = song.name.toLowerCase().includes(lowerSearch);

      const authorMatch =
        song.author && song.author.toLowerCase().includes(lowerSearch);

      return nameMatch || authorMatch;
    });

    results.sort((a, b) => {
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();
      const aAuthorLower = a.author ? a.author.toLowerCase() : "";
      const bAuthorLower = b.author ? b.author.toLowerCase() : "";

      const aNameStartsWith = aNameLower.startsWith(lowerSearch);
      const bNameStartsWith = bNameLower.startsWith(lowerSearch);
      if (aNameStartsWith && !bNameStartsWith) return -1;
      if (!aNameStartsWith && bNameStartsWith) return 1;

      const aAuthorStartsWith = aAuthorLower.startsWith(lowerSearch);
      const bAuthorStartsWith = bAuthorLower.startsWith(lowerSearch);
      if (aAuthorStartsWith && !bAuthorStartsWith) return -1;
      if (!aAuthorStartsWith && bAuthorStartsWith) return 1;

      const aNameIncludes = aNameLower.includes(lowerSearch);
      const bNameIncludes = bNameLower.includes(lowerSearch);
      if (aNameIncludes && !bNameIncludes) return -1;
      if (!aNameIncludes && bNameIncludes) return 1;

      const aAuthorIncludes = aAuthorLower.includes(lowerSearch);
      const bAuthorIncludes = bAuthorLower.includes(lowerSearch);
      if (aAuthorIncludes && !bAuthorIncludes) return -1;
      if (!aAuthorIncludes && bAuthorIncludes) return 1;

      return aNameLower.localeCompare(bNameLower, "ru");
    });

    setFilteredSongs(results);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    searchSongs(value);

    setShowTable(value.trim().length > 0);
  };

  const handleInputClick = () => {
    if (searchValue.trim().length > 0) {
      setShowTable(true);
    }
  };
  const downloadFile = (song) => {
    if (!song.file?.filename) {
      console.error("Файл не найден");
      return;
    }

    const fileUrl = `/scores/${song.file.filename}`;

    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = song.file.filename || `песня_${song.name}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCell = React.useCallback((song, columnKey) => {
    switch (columnKey) {
      case "name":
        return (
          <Link href={`/song/${song._id}`} className="text-foreground">
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize text-left">
                {song.name}
              </p>
              <p className="text-bold text-sm capitalize text-default-400 text-left">
                {getCategoryDisplay(song.category, "full")}
              </p>
            </div>
          </Link>
        );
      case "role":
        return (
          <Link href={`/song/${song._id}`} className="text-foreground">
            <div className="flex flex-col items-center justify-center">
              <p className="text-bold text-sm capitalize text-center">
                {song.author || "-"}
              </p>
              {/* <p className="text-bold text-sm capitalize text-default-400 text-center">
              {song.category}
            </p> */}
            </div>
          </Link>
        );
      case "actions":
        return (
          <div className="relative flex items-center justify-end gap-4">
            <Tooltip content="Share">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                  />
                </svg>
              </span>
            </Tooltip>
            <Tooltip content="Download">
              <span
                className="text-lg text-default-400 cursor-pointer active:opacity-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  downloadFile(song);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </span>
            </Tooltip>
            <Tooltip content="Print">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z"
                  />
                </svg>
              </span>
            </Tooltip>
          </div>
        );
      default:
      // return cellValue;
    }
  }, []);

  const [page, setPage] = React.useState(1);
  const rowsPerPage = 4;

  const pages = Math.ceil(filteredSongs.length / rowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredSongs.slice(start, end);
  }, [page, filteredSongs, rowsPerPage]);

  return (
    <SongsLibraryContextProvider albumsPromise={albumsPromise}>
      <div className="flex flex-col text-center justify-center font-header gap-4 relative mt-4">
        <Input
          ref={inputRef}
          type="search"
          placeholder="Поиск"
          value={searchValue}
          onChange={handleSearchChange}
          onClick={handleInputClick}
          isClearable
          onClear={() => {
            setSearchValue("");
            setFilteredSongs(allSongs);
            setShowTable(false);
          }}
          startContent={
            <div className="mr-2">
              {" "}
              <SearchIcon className="text-default-400" />
            </div>
          }
          className="w-100 mx-auto"
          classNames={{
            inputWrapper: "bg-[#FFFAF5] rounded-md",
            input: "text-sm",
            clearButton: "text-[#BD9673] hover:text-[#7D5E42]",
          }}
        />
        <Monogram className="h-6 w-auto" />
        <AnimatePresence>
          {showTable && (
            <motion.div
              ref={tableRef}
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="rounded-xl absolute top-1/7 left-1/2 transform -translate-x-1/2 -translate-y-1/2 translate-y-8 z-50"
            >
              <Table
                isStriped
                aria-label="Example table with custom cells"
                className="mt-4 w-150 m-3 bg-white rounded-lg shadow-xl p-1"
                bottomContent={
                  pages > 1 ? (
                    <Pagination
                      // isCompact
                      onChange={(page) => setPage(page)}
                      total={pages}
                      page={page}
                      // showControls={false}
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
                          "transition-colors duration-200",
                        ].join(" "),
                        cursor: [
                          "font-pagination",
                          "bg-gradient-to-r from-[#BD9673] to-[#7D5E42]",
                          "text-white",
                          "font-bold",
                          "shadow-lg",
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
                        Попробуйте изменить запрос
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* <div className="pl-68 pb-0 flex flex-col font-header gap-4 md:py-6">
        Стопки (?)
      </div> */}
      <div className="pl-32 pb-0 flex flex-col font-header gap-4">Песни</div>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-2">
        <div className="inline-block max-w-xl text-center justify-center">
          {/* <ModalAddScore /> */}
        </div>

        <Suspense>
          <Albums />
        </Suspense>
      </section>
    </SongsLibraryContextProvider>
  );
}
