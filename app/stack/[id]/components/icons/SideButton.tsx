"use client";

import React from "react";

interface SideButtonProps {
  className?: string;
}

const SideButton: React.FC<SideButtonProps> = ({ className }) => {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
    </svg>
  );
};

export default SideButton;
