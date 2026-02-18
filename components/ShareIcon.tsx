import React from "react";

interface ShareIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  stroke?: string;
  strokeWidth?: number;
}

const ShareIcon: React.FC<ShareIconProps> = ({
  width = 40,
  height = 40,
  className = "",
  stroke = "#1E1E1E",
  strokeWidth = 3.5,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.3167 22.5166L25.7 29.1499M25.6833 10.8499L14.3167 17.4833M35 8.33325C35 11.0947 32.7614 13.3333 30 13.3333C27.2386 13.3333 25 11.0947 25 8.33325C25 5.57183 27.2386 3.33325 30 3.33325C32.7614 3.33325 35 5.57183 35 8.33325ZM15 19.9999C15 22.7613 12.7614 24.9999 10 24.9999C7.23858 24.9999 5 22.7613 5 19.9999C5 17.2385 7.23858 14.9999 10 14.9999C12.7614 14.9999 15 17.2385 15 19.9999ZM35 31.6666C35 34.428 32.7614 36.6666 30 36.6666C27.2386 36.6666 25 34.428 25 31.6666C25 28.9052 27.2386 26.6666 30 26.6666C32.7614 26.6666 35 28.9052 35 31.6666Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ShareIcon;
