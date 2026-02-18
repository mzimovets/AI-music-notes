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
  file: {
    fieldname: string;
    originalName: string;
    encoding: string;
    mimetype: string;
    destination: string;
    filename: string;
    path: string;
    size: number;
  } | null;
  category?: string;
  docType: "song";
  _id: string;
  authorArrange?: string;
  authorLyrics?: string;
};

export interface StackSong extends Song {
  instanceId: string;
  isReserve: false;
}

export type Stack = {
  _id: string;
  name: string;
  songs: StackSong[];
  isPublished: boolean;
};
