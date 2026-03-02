import { StackSong } from "./types";

export const postStack = async (name: string, id?: string) => {
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
  cover,
  id,
}: {
  stack: StackSong[];
  isPublished: boolean;
  mealType: string;
  programSelected: [];
  name: string;
  cover: string;
  id?: string;
}) => {
  const updateData = {
    songs: stack,
    isPublished,
    mealType,
    programSelected,
    name,
    _id: id,
    docType: "stack",
  };
  if (cover) {
    updateData.cover = cover;
  }
  const resp = await fetch(`http://localhost:4000/stack/${id}/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  const respBody = await resp.json();
  return respBody;
};

export const getStackById = async (id: string) => {
  const data = await fetch(`http://localhost:4000/stack/${id}`);
  const posts = await data.json();
  return posts;
};
