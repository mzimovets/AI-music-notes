import { Button } from "@heroui/button";
import { CloseIcon } from "./icon/CloseIcon";
import { useRouter } from "next/navigation";

export const CloseButton = () => {
  const router = useRouter();
  return (
    <Button
      onPress={() => router.back()}
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
      "
    >
      <CloseIcon className="w-5 h-5 text-black/70 group-hover:text-black transition-colors" />
    </Button>
  );
};
