import React from "react";
import { getStackById } from "@/lib/stack-requests";
import { StackContextProvider } from "@/app/stack/[id]/components/StackContextProvider";

export default async function StackViewLayout({ children, params }) {
  const { id } = await params; // <-- обязательно await
  const stack = await getStackById(id);

  return (
    <StackContextProvider stackResponse={stack}>
      <div className="stack-view-layout">{children}</div>
    </StackContextProvider>
  );
}
