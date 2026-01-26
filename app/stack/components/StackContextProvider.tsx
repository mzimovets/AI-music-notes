"use client";
import { ServerSong } from "@/lib/types";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";

export const StackContext = createContext<{} | null>(null);

export function StackContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stackSongs, setStackSongs] = useState([]);
  return (
    <StackContext.Provider value={{ stackSongs, setStackSongs }}>
      {children}
    </StackContext.Provider>
  );
}

export function useStackContext() {
  const context = useContext(StackContext);
  if (!context) {
    throw new Error("component must be in StackLibraryContext");
  }
  return context;
}
