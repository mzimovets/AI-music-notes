"use client";
import { ServerSong } from "@/lib/types";
import { createContext, useContext } from "react";

export const SongContext = createContext<{
  songResponse: { status: string; docs: ServerSong[] };
} | null>(null);

export function SongContextProvider({
  children,
  songResponse,
}: {
  children: React.ReactNode;
  songResponse: { status: string; docs: ServerSong[] };
}) {
  return (
    <SongContext.Provider value={{ songResponse }}>
      {children}
    </SongContext.Provider>
  );
}

export function useSongContext() {
  const context = useContext(SongContext);
  if (!context) {
    throw new Error("component must be in SongsContextProvider");
  }
  return context;
}
