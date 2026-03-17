import React from "react";
import { getSongById } from "@/lib/utils";
import { StackContextProvider } from "./components/StackContextProvider";
import { getStackById } from "@/lib/stack-requests";

export default async function StackLayout({ children, params }) {
  const stack = await getStackById(params.id);

  return (
    <StackContextProvider stackResponse={stack}>
      <div>
        <main className="">{children}</main>
      </div>
    </StackContextProvider>
  );
}
