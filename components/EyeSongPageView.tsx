"use client";
import { Button } from "@heroui/button";
import { useRouter } from "next/navigation";

import { EyeIcon } from "./icons/EyeIcon";

export const EyeSongPageView = ({ songId }: { songId: string }) => {
  const router = useRouter();

  return (
    <div>
      <Button
        className="absolute top-6 right-2 z-10 min-w-0 px-2 py-2 bg-blue-50 text-blue-400 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
        radius="full"
        size="md"
        onClick={() => router.push(`/songRead/${songId}`)}
      >
        <EyeIcon className="w-6 h-6" />
      </Button>
    </div>
  );
};
