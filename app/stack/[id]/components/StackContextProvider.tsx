"use client";

import { StackSong } from "@/lib/types";
import { createContext, useContext, useState } from "react";

export const StackContext = createContext<{
  stackResponse: { status: string; doc: StackSong };
} | null>(null);

export function StackContextProvider({
  children,
  stackResponse,
}: {
  children: React.ReactNode;
  stackResponse: { status: string; doc: StackSong };
}) {
  const [stackName, setStackName] = useState("");
  const [stackCover, setStackCover] = useState("");
  const [stackSongs, setStackSongs] = useState<any[]>(() => (stackResponse.doc as any)?.songs || []);
  const [mealType, setMealType] = useState<string | null>(() => (stackResponse.doc as any)?.mealType ?? null);
  const [programSelected, setProgramSelected] = useState<string[]>(() => (stackResponse.doc as any)?.programSelected || []);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const removeSong = (instanceId) => {
    setStackSongs((prev) =>
      prev.filter((song) => song.instanceId !== instanceId),
    );
  };

  const clearStack = () => setStackSongs([]);
  return (
    <StackContext.Provider
      value={{
        stackResponse,
        stackSongs,
        setStackSongs,
        removeSong,
        clearStack,
        mealType,
        setMealType,
        programSelected,
        setProgramSelected,
        stackName,
        setStackName,
        stackCover,
        setStackCover,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
      }}
    >
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
