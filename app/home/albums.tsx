"use client";

import { Card, ScrollShadow, Button } from "@heroui/react";
import { useContext, useRef } from "react";
import { SongsLibraryContext } from "../providers";
import { useRouter } from "next/navigation";
import { categorySongs } from "@/components/constants";
import SwarrowIcon, { SwarrowIconWithCircle } from "@/components/swarrow";

export default function Albums() {
  const context = useContext(SongsLibraryContext) || {};
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Функция для прокрутки влево
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300, // Прокручиваем на ширину примерно 2 карточек
        behavior: "smooth",
      });
    }
  };

  // Функция для прокрутки вправо
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="w-full flex justify-start ml-33 mb-4">
        <div className="flex gap-4">
          <button
            onClick={scrollLeft}
            className="cursor-pointer p-2 hover:opacity-80 transition-opacity"
            title="Предыдущие"
          >
            <SwarrowIconWithCircle width={50} height={13} circleSize={20} />
          </button>
          <button
            onClick={scrollRight}
            className="cursor-pointer p-2 hover:opacity-80 transition-opacity"
            title="Следующие"
          >
            <SwarrowIconWithCircle
              width={50}
              height={13}
              circleSize={20}
              className="rotate-180"
            />
          </button>
          <Button radius="full" isIconOnly>
            -
          </Button>
        </div>
      </div>
      <ScrollShadow
        hideScrollBar
        className="w-full w-[800px] mx-auto"
        orientation="horizontal"
        size={120}
        offset={20}
      >
        <div
          ref={scrollContainerRef}
          className="flex gap-6 pb-4  w-[796px]" //если убрать overflow-x-auto, то появится тень!!!
          style={{
            scrollbarWidth: "thin",
            scrollBehavior: "smooth",
          }}
        >
          {categorySongs.map(
            (
              post: { key: string; name: string; image: string },
              index: number
            ) => (
              <div
                key={post.key}
                className="flex-shrink-0 flex flex-col items-center"
              >
                <Card
                  onPress={() => router.push(`/playlist/${post.key}`)}
                  isPressable
                  className="w-40 h-40 rounded-xl shadow-lg"
                ></Card>
                <p className="mt-3 text-center font-medium text-sm md:text-base card-header">
                  {post.name || `Альбом ${index + 1}`}
                </p>
              </div>
            )
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}
