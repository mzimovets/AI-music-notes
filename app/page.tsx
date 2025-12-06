// "use client";
import ModalAddScore from "./home/modalAddScore";
import { Suspense } from "react";
import { getData } from "@/lib/utils";
import Albums from "./home/albums";
import { SongsLibraryContextProvider } from "./providers";

export default function Home() {
  const albumsPromise = getData();
  return (
    <SongsLibraryContextProvider albumsPromise={albumsPromise}>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        <div className="inline-block max-w-xl text-center justify-center">
          <ModalAddScore />
        </div>
        <Suspense>
          <Albums />
        </Suspense>
      </section>
    </SongsLibraryContextProvider>
  );
}

// <div className="flex gap-5">
//   <Card
//     isPressable
//     className=" z-50 w-30 h-30 flex items-center justify-center"
//   >
//     Тут песня
//   </Card>
//   <Card className=" z-50 w-30 h-30 flex items-center justify-center">
//     Тут песня
//   </Card>
//   <Card className=" z-50 w-30 h-30 flex items-center justify-center">
//     Тут песня
//   </Card>
//   <Card className=" z-50 w-30 h-30 flex items-center justify-center">
//     Тут песня
//   </Card>
//   <Card className=" z-50 w-30 h-30 flex items-center justify-center">
//     Тут песня
//   </Card>
//   <Card className=" z-50 w-30 h-30 flex items-center justify-center">
//     Тут песня
//   </Card>
// </div>
