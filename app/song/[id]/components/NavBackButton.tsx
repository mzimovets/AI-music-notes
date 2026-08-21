"use client";
import { LeftArr } from "@/components/LeftArr";
import { useRouter } from "next/navigation";

export const NavBackButton = () => {
  const router = useRouter();
  return (
    <div className="fixed left-0 z-50" style={{ top: 82 }}>
      {/* На телефоне фигура меньше: в прежнем размере она занимала треть
          высоты экрана. Размеры заданы классами, а не жёстко в разметке,
          поэтому вся фигура масштабируется целиком */}
      <button
        onClick={() => router.back()}
        className="relative flex items-center justify-center active:opacity-70 transition-opacity w-[30px] h-[140px] md:w-[42px] md:h-[200px]"
        aria-label="Назад"
      >
        <svg
          viewBox="0 0 42 200"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full"
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
        <LeftArr className="relative z-10 w-6 h-6 md:w-8 md:h-8 ml-1 md:ml-2" />
      </button>
    </div>
  );
};
