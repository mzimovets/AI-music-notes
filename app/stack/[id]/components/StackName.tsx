"use client";
import { Input } from "@heroui/react";
import { useStackContext } from "./StackContextProvider";
import { useEffect } from "react";

export const StackName = () => {
  const { stackResponse, stackName, setStackName } = useStackContext();
  // useEffect(() => {
  //   if (stackName === "") {
  //     setStackName(stackResponse.doc?.name);
  //   }
  // });

  useEffect(() => {
    if (stackResponse.doc?.name) {
      setStackName(stackResponse.doc.name);
    }
  }, [stackResponse.doc?.name]);

  const onChangeStackName = (e) => {
    setStackName(e.target.value);
  };

  return (
    <Input
      classNames={{
        input: [
          "bg-transparent",
          "border-none",
          "outline-none",
          "shadow-none", // убирает тень
          "p-0",
          "focus:shadow-none", // убирает тень при фокусе
          "focus:outline-none", // дополнительно убирает outline при фокусе
        ],
        base: "bg-transparent",
        mainWrapper: "bg-transparent",
        wrapper: [
          "bg-transparent",
          "shadow-none", // убирает тень у обертки
          "focus:shadow-none", // убирает тень у обертки при фокусе
          "group-focus:shadow-none", // для некоторых состояний
        ],
        innerWrapper: "bg-transparent",
        inputWrapper: [
          "bg-transparent",
          "shadow-none", // убирает тень у обертки инпута
          "focus:shadow-none",
          "hover:shadow-none",
          "data-[hover=true]:shadow-none", // для Hero UI
          "data-[focus=true]:shadow-none", // для Hero UI
          "!shadow-none", // !important на всякий случай
        ],
      }}
      style={{
        fontFamily: "Roboto Slab, serif",
        fontSize: "24px",
        fontWeight: "bold",
        textAlign: "center",
      }}
      defaultValue={stackResponse.doc?.name}
      value={stackName}
      onChange={onChangeStackName}
    />
  );
};
