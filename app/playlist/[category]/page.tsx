import React from "react";
import PlaylistLayout from "./layout";
import { categorySongs } from "@/components/constants";
import { CategoryHeader } from "./components/CategoryHeader";
import { SongsTable } from "./components/SongsTable";
import { getSongs } from "@/lib/utils";
import { PlaylistContextProvider } from "./PlaylistContextProvider";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const playlistSongs = await getSongs(category);

  return (
    <PlaylistContextProvider songsResponse={playlistSongs}>
      <PlaylistLayout>
        <CategoryHeader categorySongs={categorySongs} />

        <SongsTable />
      </PlaylistLayout>
    </PlaylistContextProvider>
  );
}
