"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";

import { LeftArr } from "@/components/LeftArr";

export const NavBackButton = () => {
  const router = useRouter();
  const buttonClassName =
    "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full";

  return (
    <div>
      <Button
        isIconOnly
        className={`${buttonClassName} font-normal shadow-md absolute left-35 top-20`}
        onPress={() => {
          router.push("/");
        }}
      >
        <LeftArr className="h-6 w-6" />
      </Button>
    </div>
  );
};
