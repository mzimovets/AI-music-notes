import React from "react";
import { getSongById } from "@/lib/utils";
import { DocViewer } from "../song/[id]/components/DocViewer";
import { StackViewer } from "./components/StackViewer";

export default async function Page({ params }) {
  const song = await getSongById(params.id);

  return (
    <div>
      <h1>{song.title}</h1>
      <StackViewer fileUrl={"/pdf.pdf"} />
      hi
    </div>
  );
}
