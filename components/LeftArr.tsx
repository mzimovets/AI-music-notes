import React from "react";

interface LeftArrProps {
  className?: string;
}

export const LeftArr: React.FC<LeftArrProps> = ({ className }) => (
  <svg
    className={className}
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M30 36L18 24L30 12"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
