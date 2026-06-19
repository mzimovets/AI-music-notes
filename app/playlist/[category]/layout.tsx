import { SongContextProvider } from "@/app/song/[id]/SongContextProvider";

export default function PlaylistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SongContextProvider>
      <section className="flex flex-col justify-center gap-4">
        {children}
      </section>
    </SongContextProvider>
  );
}
