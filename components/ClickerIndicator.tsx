"use client";

import { useEffect, useState } from "react";
import { Chip } from "@heroui/react";
import { useSession } from "next-auth/react";
import { ClickerIcon } from "./ClickerIcon";

export function ClickerIndicator() {
  const { data: session } = useSession();

  // Получаем начальный статус из глобального хранилища
  const getInitialStatus = () => {
    if (typeof window === "undefined") return false;
    return (window as any).clickerStatus?.connected ?? false;
  };

  const [isConnected, setIsConnected] = useState<boolean>(getInitialStatus());

  const isRegent = session?.user?.role === "регент";

  // Не показываем компонент если пользователь не регент
  if (!isRegent) return null;

  useEffect(() => {
    const handleClickerStatus = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsConnected(customEvent.detail.connected);
    };

    window.addEventListener("clicker:connected", handleClickerStatus);

    return () => {
      window.removeEventListener("clicker:connected", handleClickerStatus);
    };
  }, []);

  return (
    <div className="fixed bottom-3 left-3 z-50">
      <Chip
        size="lg"
        variant="flat"
        className={`${
          isConnected
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        } flex px-4 py-3`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <ClickerIcon connected={isConnected} size={40} />
        </div>
      </Chip>
    </div>
  );
}
