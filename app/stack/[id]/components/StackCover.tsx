"use client";
import { Input } from "@heroui/react";
import { useStackContext } from "./StackContextProvider";
import { useEffect } from "react";
import { Image } from "@heroui/react";

export const StackCover = () => {
  const { stackResponse, stackName, setStackName } = useStackContext();
  useEffect(() => {
    if (stackName === "") {
      setStackName(stackResponse.doc?.name);
    }
  });

  const onChangeStackName = (e) => {
    setStackName(e.target.value);
  };

  return (
    <div className="flex justify-center">
      <Image
        style={{ width: "180px", height: "auto" }}
        src="/stacks/preview/cover-preview-blue.png"
      />
    </div>
  );
};
