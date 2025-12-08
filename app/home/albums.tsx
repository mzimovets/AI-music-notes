"use client";

import { Card } from "@heroui/react";
import { use, useContext } from "react";
import { SongsLibraryContext } from "../providers";

export default function Albums() {
  const context = useContext(SongsLibraryContext) || {};
  const albums = use(context.albumsPromise);
  return (
    <div style={{ display: "flex", gap: "18px" }}>
      {albums?.docs.map((post: { name: string; title: string }) => (
        <div key={post.name} className="flex flex-col items-center">
          <Card className="w-40 h-40"></Card>
          <p className="mt-2">{post.name}</p> {/* Подпись снизу с отступом */}
        </div>
      ))}
    </div>
  );
}
