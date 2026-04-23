"use client";

import { Chip } from "@heroui/react";
import { ClickerIcon } from "./ClickerIcon";

export function ClickerIndicator({ isConnected, hidden }: { isConnected: boolean; hidden?: boolean }) {
  return (
    <div className={`fixed bottom-3 left-3 z-50 transition-all duration-200 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <Chip
        size="lg"
        variant="flat"
        className={`${
          isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        } flex px-4 py-3`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <ClickerIcon connected={isConnected} size={40} />
        </div>
      </Chip>
    </div>
  );
}
