export type Reprise = {
  /** Страница (1-based внутри PDF песни), на которой показывается кнопка перехода */
  fromPage: number;
  /** Страница (1-based внутри PDF песни), на которую нужно перейти */
  toPage: number;
};

export type Song = {
  name: string;
  author?: string;
  file: File | null;
  category?: string;
  docType: "song";
  authorArrange?: string;
  authorLyrics?: string;
  reprises?: Reprise[];
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
  reprises?: Reprise[];
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
