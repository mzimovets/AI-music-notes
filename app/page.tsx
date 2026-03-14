"use client";
import { Suspense, useEffect, useState } from "react";
import React from "react";
import { Button } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

import Albums from "./home/albums";
import {
  SongsLibraryContextProvider,
  useAllSongsLibraryContextProvider,
} from "./providers";
import { StackCard } from "./home/StackCard";
import { Search } from "./home/search/Search";

import { LeftArrIcon } from "@/components/icons/LeftArrIcon";
import { DownArrIcon } from "@/components/icons/DownArrIcon";

export default function Home() {
  const albumsPromise = new Promise((resolve) => resolve(null));
  const { allSongs, setAllSongs } = useAllSongsLibraryContextProvider();
  const [stacks, setStacks] = useState([]);

  const [, setIsLoading] = useState(false);
  const [showStacks, setShowStacks] = useState(false);

  useEffect(() => {
    const fetchAllSongs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/songs`,
        );
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
          // setFilteredSongs(songs);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAllStacks = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASIC_BACK_URL}/stacks`,
        );
        const data = await response.json();

        if (data.status === "ok" && data.docs) {
          setStacks(data.docs);
        }
      } catch {
      } finally {
      }
    };

    fetchAllSongs();
    fetchAllStacks();
  }, []);

  return (
    <SongsLibraryContextProvider albumsPromise={albumsPromise}>
      <Search allSongs={allSongs} />

      {/* Stacks.tsx */}
      {stacks.length > 0 && (
        <div className="pl-32 px-4 pb-0 flex items-center font-header gap-4 mt-8">
          {/* Оборачиваем текст в span с курсором */}
          <div
            className="leading-none cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onClick={() => setShowStacks((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowStacks((prev) => !prev);
              }
            }}
          >
            Стопки
          </div>

          {stacks.length > 4 && (
            <Button
              isIconOnly
              aria-label={showStacks ? "Скрыть стопки" : "Показать стопки"}
              className="
      flex items-center justify-center
      h-8 w-8 p-0
      bg-transparent border-none shadow-none
      text-black
      transition-transform duration-200
      hover:scale-110
      focus:outline-none
      active:outline-none
    "
              type="button"
              onPress={() => {
                setShowStacks((prev) => !prev);
              }}
            >
              {showStacks ? (
                <DownArrIcon className="text-black" height={18} width={18} />
              ) : (
                <LeftArrIcon className="text-black" height={18} width={18} />
              )}
            </Button>
          )}
        </div>
      )}
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-2">
        <AnimatePresence initial={false}>
          {(showStacks || stacks.length <= 4) && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
                <StackCard stacks={stacks} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {/*End Stacks.tsx */}

      <div className="pl-32 pb-0 flex flex-col font-header gap-4 mt-8">
        Песни
      </div>
      {/* <LoadingCamerton /> */}
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-2">
        <Suspense>
          <Albums />
        </Suspense>
      </section>
    </SongsLibraryContextProvider>
  );
}
