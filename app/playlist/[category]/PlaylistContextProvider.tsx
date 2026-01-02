"use client";
import { ServerSong } from "@/lib/types";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";

export const PlaylistContext = createContext<{
  songsResponse: { status: string; docs: ServerSong[] };
  searchValue: string;
  setSearchValue: Dispatch<SetStateAction<string>>;
} | null>(null);

export function PlaylistContextProvider({
  children,
  songsResponse,
}: {
  children: React.ReactNode;
  songsResponse: { status: string; docs: ServerSong[] };
}) {
  // Состояние для поиска
  const [searchValue, setSearchValue] = useState("");
  return (
    <PlaylistContext.Provider
      value={{ songsResponse, searchValue, setSearchValue }}
    >
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
