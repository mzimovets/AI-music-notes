"use client";
import { Image } from "@heroui/react";

import { useStackContext } from "./StackContextProvider";

export const StackCover = () => {
  const { stackResponse, stackCover } = useStackContext();

  return (
    <div className="flex justify-center">
      <Image
        src={`/stacks/preview/${stackCover || stackResponse.doc?.cover || "white"}.png`}
        style={{ width: "280px", height: "auto" }}
      />
    </div>
  );
};
