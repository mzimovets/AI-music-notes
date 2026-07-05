"use client";
import { LeftArr } from "@/components/LeftArr";
import { useRouter } from "next/navigation";

export const NavBackButton = () => {
  const router = useRouter();
  return (
    <div className="fixed left-0 z-50" style={{ top: 82 }}>
      <button
        onClick={() => router.back()}
        className="relative flex items-center justify-center active:opacity-70 transition-opacity"
        style={{ width: 42, height: 200 }}
        aria-label="Назад"
      >
        <svg
          width="42"
          height="200"
          viewBox="0 0 42 200"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0"
          style={{ filter: "drop-shadow(2px 3px 5px rgba(0,0,0,0.25))" }}
        >
          <defs>
            <linearGradient id="navBackGradSong" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#BD9673" />
              <stop offset="100%" stopColor="#7D5E42" />
            </linearGradient>
          </defs>
          <path
            d="M 0,0 C 0,60 40,60 40,100 C 40,140 0,140 0,200 Z"
            fill="url(#navBackGradSong)"
          />
        </svg>
        <LeftArr className="relative z-10 w-8 h-8" style={{ marginLeft: 8 }} />
      </button>
    </div>
  );
};
