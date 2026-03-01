"use server";

import { postStack, putStack } from "@/lib/stack-requests";
import { Song, StackSong } from "@/lib/types";
import { deleteSong, deleteStack, postSong, putSong } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function addSong(song: Song, currentUrl: string) {
  const response = await postSong(song, Math.random().toString());
  revalidatePath(currentUrl);
  return response;
}

export async function removeSong(id: string) {
  revalidatePath("/song");
  return await deleteSong(id);
}

export async function editSong(id: string, song: Partial<Song>) {
  const response = await putSong(song, id);
  revalidatePath(`/song/${id}`);
  return response;
}

export async function saveStack(name: string, id: string, currentUrl: string) {
  // there will be update
  const response = await postStack(name, id);
  revalidatePath(currentUrl);
  return response;
}

export async function updateStack({
  stack,
  isPublished,
  mealType,
  programSelected,
  currentUrl,
  name,
  cover,
  id,
}: {
  stack: StackSong[];
  isPublished: boolean;
  mealType: string;
  programSelected: [];
  currentUrl: string;
  name: string;
  cover: string;
  id: string;
}) {
  // there will be update
  const response = await putStack({
    stack,
    isPublished,
    mealType,
    programSelected,
    name,
    cover,
    id,
  });
  revalidatePath(currentUrl);
  return response;
}

export async function removeStack(id: string) {
  revalidatePath("/");
  return await deleteStack(id);
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
