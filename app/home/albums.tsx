"use client";

import { Card } from "@heroui/react";
import { use, useContext } from "react";
import { SongsLibraryContext } from "../providers";

export default function Albums() {
  const context = useContext(SongsLibraryContext) || {};
  const albums = use(context.albumsPromise);
  return (
    <div>
      {albums?.docs.map((post: { name: string; title: string }) => (
        <Card key={post.name}>{post.name}</Card>
      ))}
    </div>
  );
}
