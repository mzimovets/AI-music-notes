"use client";
import ModalAddScore from "./home/modalAddScore";
import { Suspense } from "react";
import { getData } from "@/lib/utils";
import Albums from "./home/albums";
import { SongsLibraryContextProvider } from "./providers";
import { PdfViewer } from "./home/pdfViewer";
import { Input } from "@heroui/react";
import { SearchIcon } from "@/components/icons";
import { Monogram } from "@/components/monogram";

export default function Home() {
  const albumsPromise = getData();
  return (
    <SongsLibraryContextProvider albumsPromise={albumsPromise}>
      <div className="flex flex-col text-center justify-center font-header gap-4">
        Заголовок
        <Input
          type="search"
          placeholder="Поиск"
          endContent={<SearchIcon className="text-default-400" />}
          className="w-100 mx-auto "
          classNames={{
            inputWrapper: "bg-[#FFFAF5] rounded-md",
            input: "text-sm",
          }}
        />
        <Monogram className="h-6 w-auto" />
      </div>
      <div className="pl-68 pb-0 flex flex-col font-header gap-4 md:py-6">
        Песни
      </div>
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
