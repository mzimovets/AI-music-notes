import React from "react";
import { getSongById } from "@/lib/utils";
import { StackContextProvider } from "./components/StackContextProvider";

export default async function StackLayout({ children, params }) {
  const song = await getSongById(params.id);

  return (
    <StackContextProvider>
      <div>
        <main className="">{children}</main>
      </div>
    </StackContextProvider>
  );
}
