import React from "react";

interface LeftArrProps {
  className?: string;
}

export const LeftArr: React.FC<LeftArrProps> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    height="48"
    viewBox="0 0 48 48"
    width="48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M30 36L18 24L30 12"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
    />
  </svg>
);
