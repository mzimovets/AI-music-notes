"use client";

import { Chip } from "@heroui/react";
import { ClickerIcon } from "./ClickerIcon";

/**
 * Индикатор кликера временно убран с экрана.
 *
 * Показывать его сейчас нечестно: про Bluetooth-пульт, подключённый прямо к
 * планшету, браузер знать ничего не может, а про пульт через реле индикатор
 * говорит лишь то, что жива связь с сервером, — и то и другое вводило в
 * заблуждение. Вернуть: поставить здесь true, больше ничего менять не надо.
 *
 * От этого же значения зависит положение кнопки репризы: она поднимается
 * над индикатором только когда он виден (см. stackView и songRead).
 */
export const CLICKER_INDICATOR_ENABLED = false;

export function ClickerIndicator({ isConnected, hidden }: { isConnected: boolean; hidden?: boolean }) {
  if (!CLICKER_INDICATOR_ENABLED) return null;

  return (
    <div className={`fixed bottom-3 left-3 z-50 transition-all duration-200 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <Chip
        size="lg"
        variant="flat"
        className={`${
          isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        } flex md:px-4 md:py-3 px-1 py-1`}
      >
        <div className="flex items-center md:gap-3 gap-1">
          <span className={`md:w-3 md:h-3 w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="md:hidden"><ClickerIcon connected={isConnected} size={24} /></span>
          <span className="hidden md:block"><ClickerIcon connected={isConnected} size={40} /></span>
        </div>
      </Chip>
    </div>
  );
}
