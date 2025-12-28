export type Song = {
  name: string;
  author?: string;
  file: File | null;
  category?: string;
  docType: "song";
  authorArrange?: string;
  authorLyrics?: string;
  // _id: string;
};

export type ServerSong = {
  name: string;
  author?: string;
  file: File | null;
  category?: string;
  docType: "song";
  _id: string;
  authorArrange?: string;
  authorLyrics?: string;
};
