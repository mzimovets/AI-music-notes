"use client";
import { LeftArr } from "@/components/LeftArr";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export const NavBackButton = () => {
  const router = useRouter();
  const buttonClassName =
    "bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full";

  return (
    <div>
      <Button
        onPress={() => {
          router.push("/");
        }}
        isIconOnly
        className={`${buttonClassName} font-normal shadow-md absolute left-35 top-20`}
      >
        <LeftArr className="h-6 w-6" />
      </Button>
    </div>
  );
};
