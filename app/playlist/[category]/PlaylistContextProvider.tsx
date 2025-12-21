"use client";
import { ServerSong } from "@/lib/types";
import { createContext, useContext } from "react";

export const PlaylistContext = createContext<{
  songsResponse: { status: string; docs: ServerSong[] };
} | null>(null);

export function PlaylistContextProvider({
  children,
  songsResponse,
}: {
  children: React.ReactNode;
  songsResponse: { status: string; docs: ServerSong[] };
}) {
  return (
    <PlaylistContext.Provider value={{ songsResponse }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylistContext() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error("component must be in SongsLibraryContext");
  }
  return context;
}
