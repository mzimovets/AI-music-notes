"use client";
import { title } from "@/components/primitives";
import { Button } from "@heroui/button";
import { LeftArr } from "@/components/LeftArr";
import { useRouter } from "next/navigation";
import { Card } from "@heroui/card";

export default function PricingPage() {
  const router = useRouter();
  return (
    <div>
      {/* <Button
        onPress={() => router.push("/")}
        className="absolute left-0 top-0 -ml-86 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md w-auto min-w-0"
      >
        <LeftArr className="h-6 w-6" />
      </Button> */}
      <div>
        <p className="flex flex-col text-center justify-center font-header gap-4">
          Название
        </p>
        <p className="font-pheader">Автор</p>
        <div className="pt-4 flex flex-col">
          <Card className="w-200 h-400 br-48">Привет!</Card>
        </div>
      </div>
    </div>
  );
}
