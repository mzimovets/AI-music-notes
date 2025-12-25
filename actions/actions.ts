"use server";

import { Song } from "@/lib/types";
import { postSong } from "@/lib/utils";

export async function addSong(song: Song) {
  return await postSong(song, Math.random().toString());
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
