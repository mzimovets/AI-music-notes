"use client";

import { useState, useEffect } from "react";
import { Button } from "@heroui/button";

export const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Показываем кнопку, когда прокрутили вниз на 300px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Плавная прокрутка
    });
  };

  return (
    <>
      {isVisible && (
        <Button
          isIconOnly
          onPress={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white shadow-xl animate-appearance-in"
          radius="full"
          size="lg"
        >
          <svg
            xmlns="http://www.w3.org"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 15.75 7.5-7.5 7.5 7.5"
            />
          </svg>
        </Button>
      )}
    </>
  );
};
