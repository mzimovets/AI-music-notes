"use client";
import ShareIcon from "@/components/ShareIcon";

export const ShareSong = () => {
  return (
    <button
      className="hover:opacity-100 transition-opacity duration-300 group"
      title="Поделиться"
    >
      <ShareIcon
        className="group-hover:text-gray-400 transition-colors duration-300"
        width={34}
        height={34}
      />
    </button>
  );
};
