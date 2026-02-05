import { StackSong } from "./types";

export const postStack = async (name: string, id?: string) => {
  console.log("POst stack data");

  const resp = await fetch(`http://localhost:4000/stack/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      _id: id,
      docType: "stack",
    }),
  });

  const respBody = await resp.json();
  return respBody;
};

export const putStack = async ({
  stack,
  isPublished,
  mealType,
  programSelected,
  name,
  id,
}: {
  stack: StackSong[];
  isPublished: boolean;
  mealType: string;
  programSelected: [];
  name: string;
  id?: string;
}) => {
  console.log("PUT stack data");

  const resp = await fetch(`http://localhost:4000/stack/${id}/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      songs: stack,
      isPublished,
      mealType,
      programSelected,
      name,
      _id: id,
      docType: "stack",
    }),
  });

  const respBody = await resp.json();
  return respBody;
};

export const getStackById = async (id: string) => {
  const data = await fetch(`http://localhost:4000/stack/${id}`);
  const posts = await data.json();
  return posts;
};
