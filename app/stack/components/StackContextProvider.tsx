"use client";

import { createContext, useContext, useState } from "react";

export const StackContext = createContext<{} | null>(null);

export function StackContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stackSongs, setStackSongs] = useState([]);
  const [mealType, setMealType] = useState<string | null>(null);
  const [programSelected, setProgramSelected] = useState<string[]>([]);

  const removeSong = (instanceId) => {
    setStackSongs((prev) =>
      prev.filter((song) => song.instanceId !== instanceId),
    );
  };

  const clearStack = () => setStackSongs([]);
  return (
    <StackContext.Provider
      value={{
        stackSongs,
        setStackSongs,
        removeSong,
        clearStack,
        mealType,
        setMealType,
        programSelected,
        setProgramSelected,
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
