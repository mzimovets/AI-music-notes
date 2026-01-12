"use server";

import { Song } from "@/lib/types";
import { deleteSong, postSong, putSong } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function addSong(song: Song) {
  return await postSong(song, Math.random().toString());
}

export async function removeSong(id: string) {
  return await deleteSong(id);
  revalidatePath("/song");
}

export async function editSong(id: string, song: Song) {
  return await putSong(song, id)
}

// "use server";

// import { Song } from "@/lib/types";
// import { postSong } from "@/lib/utils";

// export async function addSong(formData: FormData) {
//   await postSong(
//     { name: formData.get("name") as string, docType: "song" },
//     Math.random().toString()
//   );
// }
