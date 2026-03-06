import { SongContextProvider } from "@/app/song/[id]/SongContextProvider";
import { NavBackButton } from "./components/NavBackButton";

export default function PlaylistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBackButton />
      <SongContextProvider>
        <section className="flex flex-col justify-center gap-4  container">
          {children}
        </section>
      </SongContextProvider>
    </>
  );
}
