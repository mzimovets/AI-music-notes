"use client";
import { useStackContext } from "./StackContextProvider";
import { useEffect } from "react";
import { Image } from "@heroui/react";

export const StackCover = () => {
  const { stackResponse, stackCover, setStackCover } = useStackContext();
  //   useEffect(() => {
  //     if (stackCover === "") {
  //       setStackCover(stackResponse.doc?.cover);
  //     }
  //     // return () => {
  //     //   setStackCover("");
  //     // };
  //   });

  //   const onChangeStackName = (e) => {
  //     setStackName(e.target.value);
  //   };

  return (
    <div className="flex justify-center">
      <Image
        style={{ width: "180px", height: "auto" }}
        src={`/stacks/preview/${stackCover || stackResponse.doc?.cover || "white"}.png`}
      />
    </div>
  );
};
