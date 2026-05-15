import React from "react";
import { getStackById } from "@/lib/stack-requests";
import { StackContextProvider } from "@/app/stack/[id]/components/StackContextProvider";

export default async function StackViewLayout({ children, params }) {
  const { id } = await params;
  let stack;
  try {
    stack = await getStackById(id);
  } catch (e) {
    stack = null;
  }

  if (!stack?.doc) {
    stack = {
      status: "ok",
      doc: {
        _id: id,
        songs: [],
        name: "",
        isPublished: false,
        mealType: null,
        programSelected: [],
        cover: "",
      },
    };
  }

  return (
    <StackContextProvider stackResponse={stack}>
      <div className="stack-view-layout">{children}</div>
    </StackContextProvider>
  );
}
