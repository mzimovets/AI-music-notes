"use client";
import { useStackContext } from "./StackContextProvider";
import { useEffect } from "react";
import { Image } from "@heroui/react";

export const StackCover = () => {
  const { stackResponse, stackCover } = useStackContext();

  return (
    <div className="flex justify-center">
      <Image
        className="w-[280px] lg:w-[360px]"
        style={{ height: "auto" }}
        src={`/stacks/preview/${stackCover || stackResponse.doc?.cover || "white"}.png`}
      />
    </div>
  );
};
