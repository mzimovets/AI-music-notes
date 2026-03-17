import { Button } from "@heroui/button";
import { useEffect, useState } from "react";

import SidebarIcon from "@/app/stack/[id]/components/icons/SidebarIcon";

type SidebarButtonProps = {
  onPress?: () => void;
};

export const SidebarButton = ({ onPress }: SidebarButtonProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      setIsVisible(currentY < lastScrollY || currentY === 0);
      setLastScrollY(currentY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <div
      className={`transition-all duration-200 transform ${
        isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"
      }`}
    >
      <Button
        isIconOnly
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
        type="button"
        onPress={onPress}
      >
        <SidebarIcon className="w-5 h-5 text-black/70 group-hover:text-black transition-colors" />
      </Button>
    </div>
  );
};
