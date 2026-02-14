"use client";
import { Button } from "@heroui/button";
import { CloseIcon } from "@/app/stackView/[id]/components/icon/CloseIcon";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export const CloseReadButton = () => {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  console.log("id:", id);
  return (
    <Button
      onPress={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/song"); // или на страницу списка песен
        }
      }}
      isIconOnly
      type="button"
      className="
    group
    flex items-center justify-center
    w-10 h-10
    rounded-full
    bg-white/30
    backdrop-blur-lg
    border border-white/40
    shadow-[0_4px_12px_rgba(0,0,0,0.18)]
    transition-all duration-200
    hover:bg-white/40
    hover:shadow-[0_6px_16px_rgba(0,0,0,0.22)]
    active:scale-95
    bg-red-50 text-red-400
    border border-red-200
    hover:bg-red-100 hover:border-red-300
    transition-all
    shadow-sm
  "
    >
      <CloseIcon className="w-5 h-5 text-red/70 group-hover:text-red transition-colors" />
    </Button>
  );
};
