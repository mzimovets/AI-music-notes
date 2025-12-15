"use client";

import { Card } from "@heroui/react";
import { use, useContext } from "react";
import { SongsLibraryContext } from "../providers";
import { useRouter } from "next/navigation";

export default function Albums() {
  const context = useContext(SongsLibraryContext) || {};
  const albums = use(context.albumsPromise);
  const router = useRouter();

  return (
    <div style={{ display: "flex", gap: "18px" }}>
      {albums?.docs.map((post: { name: string; title: string }) => (
        <div key={post.name} className="flex flex-col items-center">
          <Card
            onPress={() => router.push("/playlist")}
            isPressable
            className="w-40 h-40"
          ></Card>
          <p className="mt-2 card-header">{post.name}</p>{" "}
          {/* Подпись снизу с отступом */}
        </div>
      ))}
    </div>
  );
}
