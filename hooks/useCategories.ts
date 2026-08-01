"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  fetchCategories,
  getCategories,
  getServerCategories,
  saveCategories,
  subscribeToCategories,
  type SongCategory,
} from "@/lib/categories-store";

export type { SongCategory };

export function useCategories() {
  const categories = useSyncExternalStore(
    subscribeToCategories,
    getCategories,
    getServerCategories,
  );

  useEffect(() => {
    fetchCategories();

    const onSync = () => fetchCategories();
    window.addEventListener("db-sync-complete", onSync);
    return () => window.removeEventListener("db-sync-complete", onSync);
  }, []);

  return { categories, saveCategories };
}
