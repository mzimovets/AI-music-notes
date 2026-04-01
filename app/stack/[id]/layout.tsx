import React from "react";
import { StackContextProvider } from "./components/StackContextProvider";
import { getStackById } from "@/lib/stack-requests";

export default async function StackLayout({ children, params }) {
  let stack;
  try {
    stack = await getStackById(params.id);
  } catch (e) {
    // Офлайн или стопка ещё не синхронизирована (создана офлайн)
    stack = null;
  }

  // Если стопки нет (новая офлайн-стопка или ошибка) — пустая заглушка
  if (!stack?.doc) {
    stack = {
      status: "ok",
      doc: {
        _id: params.id,
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
      <div>
        <main className="">{children}</main>
      </div>
    </StackContextProvider>
  );
}
