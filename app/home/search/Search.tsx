import { SearchIcon } from "@/components/icons";
import { Monogram } from "@/components/monogram";
import { Input } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ServerSong } from "@/lib/types";
import { SearchTable } from "./SearchTable";

export const Search = ({ allSongs }: { allSongs: ServerSong[] }) => {
  const [searchValue, setSearchValue] = useState("");
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showTable, setShowTable] = useState(false);

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

  return (
    <>
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
              <SearchTable filteredSongs={filteredSongs} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
