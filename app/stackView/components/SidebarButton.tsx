import SidebarIcon from "@/app/stack/components/icons/SidebarIcon";
import { Button } from "@heroui/button";

export const SidebarButton = () => {
  return (
    <Button
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
      <SidebarIcon className="w-5 h-5 text-black/70 group-hover:text-black transition-colors" />
    </Button>
  );
};
