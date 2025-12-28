import { Song } from "./types";
import { categorySongs } from "@/components/constants";

export const getCategoryDisplay = (
  key: string,
  format: "short" | "full" = "short"
): string => {
  const category = categorySongs.find((item) => item.key === key);

  if (!category) return key;

  if (format === "full") {
    const fullNames: Record<string, string> = {
      spiritual_chants: "Духовные канты",
      easter: "Пасхальные песни",
      carols: "Колядки",
      folk: "Народные песни",
      soviet: "Советские песни",
      military: "Военные песни",
      childrens: "Детские песни",
      other: "Другие песни",
    };
    return fullNames[key] || `${category.name} песни`;
  }

  return category.name;
};

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
  formData.append("authorArrange", data.authorArrange || "");
  formData.append("authorLyrics", data.authorLyrics || "");
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

export const deleteSong = async (id: string) => {
  console.log("delete song", id);
  const data = await fetch(`http://localhost:4000/song/${id}/true`, {
    headers: {
      method: "GET",
    },
  });

  const posts = await data.json();
  return posts;
};
