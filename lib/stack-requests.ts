import { StackSong } from "./types";

export const postStack = async (
  data: StackSong[],
  isPublished: boolean,
  mealType: string,
  programSelected: [],
  id?: string,
) => {
  console.log("POst stack data");

  const resp = await fetch(`http://localhost:4000/stack/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      songs: data,
      isPublished,
      _id: id,
    }),
  });

  const respBody = await resp.json();
  return respBody;
};
