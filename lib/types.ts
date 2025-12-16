export type Song = {
  name: string;
  author?: string;
  file: File | null;
  docType: "song";
  //   _id: string;
};
