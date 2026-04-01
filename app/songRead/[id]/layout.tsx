import React from "react";
import { getSongById } from "@/lib/utils";
import { SongContextProvider } from "@/app/song/[id]/SongContextProvider";

export default async function SongReadLayout({ children, params }) {
  const { id } = await params;

  let song;
  try {
    song = await getSongById(id);
  } catch (e) {
    song = { status: "ok", doc: { _id: id } };
  }

  if (!song?.doc) {
    song = { status: "ok", doc: { _id: id } };
  }

  return (
    <SongContextProvider songResponse={song}>
      <div>{children}</div>
    </SongContextProvider>
  );
}
