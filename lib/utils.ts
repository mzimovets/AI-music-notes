import { Song } from "./types";

export async function getData() {
  //   const data = await fetch("https://api.vercel.app/blog");
  const data = await fetch("http://localhost:4000/songs");

  const posts = await data.json();
  return posts;
}

export const getSongs = async (category?: string) => {
  if (category) {
    const data = await fetch(`http://localhost:4000/songs/${category}`);

    const posts = await data.json();
    return posts;
  } else {
    const data = await fetch("http://localhost:4000/songs");

    const posts = await data.json();
    return posts;
  }
};

export const getSongById = async (id: string) => {
  const data = await fetch(`http://localhost:4000/song/${id}`);
  const posts = await data.json();
  return posts;
};

export const postSong = async (data: Song, id?: string) => {
  console.log("POst song data", data);
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("author", data.author || "");
  formData.append("file", data.file || "");
  formData.append("docType", data.docType || "");
  formData.append("category", data.category || "");
  const resp = await fetch(`http://localhost:4000/song/${id}`, {
    method: "POST",
    body: formData,
  });

  const posts = await resp.json();
  return posts;
};

const putSong = async () => {
  const data = await fetch(`http://localhost:4000/song`, {
    headers: {
      method: "PUT",
    },
  });

  const posts = await data.json();
  return posts;
};
