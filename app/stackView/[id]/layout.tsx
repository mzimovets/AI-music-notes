import React from "react";
import { getStackById } from "@/lib/stack-requests";
import { StackContextProvider } from "@/app/stack/[id]/components/StackContextProvider";

export default async function StackViewLayout({ children, params }) {
  const stack = await getStackById(params.id);
  return (
    <StackContextProvider stackResponse={stack}>
      <div className="stack-view-layout">
        {/* Navbar здесь нет */}
        <main>{children}</main>
      </div>
    </StackContextProvider>
  );
}
