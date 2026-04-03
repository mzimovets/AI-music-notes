"use client";
import { Suspense, useEffect, useState } from "react";

import React from "react";
import Albums from "./home/albums";
import {
  SongsLibraryContextProvider,
  useAllSongsLibraryContextProvider,
} from "./providers";

import { Button } from "@heroui/react";

import { motion, AnimatePresence } from "framer-motion";
import { LoadingCamerton } from "@/components/LoadingCamerton";
import { StackCard } from "./home/StackCard";
import { LeftArrIcon } from "@/components/icons/LeftArrIcon";
import { DownArrIcon } from "@/components/icons/DownArrIcon";
import { Search } from "./home/search/Search";
import { useSession } from "next-auth/react";
import { getBackendBaseUrl } from "@/lib/client-url";
import { socket } from "@/lib/socket";

export default function Home() {
  const albumsPromise = new Promise((resolve) => resolve(null));
  const { allSongs, setAllSongs } = useAllSongsLibraryContextProvider();
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";
  const [stacks, setStacks] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [showStacks, setShowStacks] = useState(false);

  useEffect(() => {
    const backUrl = getBackendBaseUrl();

    const fetchAllSongs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${backUrl}/songs`);
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
      } catch (error) {
        console.error("Ошибка при загрузке песен:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAllStacks = async () => {
      try {
        const response = await fetch(`${backUrl}/stacks`);
        const data = await response.json();

        if (data.status === "ok" && data.docs) {
          console.log("stacks", data.docs);
          setStacks(data.docs);
        }
      } catch (error) {
        console.error("Ошибка при загрузке stacks:", error);
      } finally {
        // setIsLoading(false);
      }
    };

    fetchAllSongs();
    fetchAllStacks();

    const handleVisibilityChanged = ({ stackId, isPublished, deleted, stackData }: { stackId: string; isPublished?: boolean; deleted?: boolean; stackData?: any }) => {
      if (deleted) {
        setStacks((prev) => prev.filter((s: any) => s._id !== stackId));
      } else if (isPublished === false) {
        setStacks((prev) => prev.map((s: any) => s._id === stackId ? { ...s, isPublished: false } : s));
      } else if (isPublished === true) {
        setStacks((prev) => {
          const exists = prev.some((s: any) => s._id === stackId);
          if (exists) {
            return prev.map((s: any) => s._id === stackId ? { ...s, isPublished: true } : s);
          }
          return stackData ? [...prev, stackData] : prev;
        });
      }
    };

    socket.on("stack-visibility-changed", handleVisibilityChanged);
    return () => {
      socket.off("stack-visibility-changed", handleVisibilityChanged);
    };
  }, []);

  return (
    <SongsLibraryContextProvider albumsPromise={albumsPromise}>
      <Search allSongs={allSongs} />

      {/* Stacks.tsx */}
      {(isRegent ? stacks.length > 0 : stacks.some((s) => s.isPublished)) && (
        <div className="pb-0 flex items-center font-header gap-4 mt-8">
          {/* Оборачиваем текст в span с курсором */}
          <div
            onClick={() => setShowStacks((prev) => !prev)}
            className="leading-none cursor-pointer select-none"
          >
            Стопки
          </div>

          {stacks.length > 4 && (
            <Button
              isIconOnly
              type="button"
              onPress={(e) => {
                setShowStacks((prev) => !prev);
              }}
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
              aria-label={showStacks ? "Скрыть стопки" : "Показать стопки"}
            >
              {showStacks ? (
                <DownArrIcon width={18} height={18} className="text-black" />
              ) : (
                <LeftArrIcon width={18} height={18} className="text-black" />
              )}
            </Button>
          )}
        </div>
      )}
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-2">
        <AnimatePresence initial={false}>
          {(showStacks || stacks.length <= 4) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
                <StackCard stacks={stacks} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {/*End Stacks.tsx */}

      <div className="pb-0 flex flex-col font-header gap-4 mt-8">
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
