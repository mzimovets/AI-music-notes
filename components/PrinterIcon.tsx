import React from "react";

interface PrinterIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  stroke?: string;
  strokeWidth?: number;
}

const PrinterIcon: React.FC<PrinterIconProps> = ({
  width = 40,
  height = 40,
  className = "",
  stroke = "#1E1E1E",
  strokeWidth = 4,
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
        d="M10 14.9999V3.33325H30V14.9999M10 29.9999H6.66668C5.78262 29.9999 4.93478 29.6487 4.30965 29.0236C3.68453 28.3985 3.33334 27.5506 3.33334 26.6666V18.3333C3.33334 17.4492 3.68453 16.6014 4.30965 15.9762C4.93478 15.3511 5.78262 14.9999 6.66668 14.9999H33.3333C34.2174 14.9999 35.0652 15.3511 35.6904 15.9762C36.3155 16.6014 36.6667 17.4492 36.6667 18.3333V26.6666C36.6667 27.5506 36.3155 28.3985 35.6904 29.0236C35.0652 29.6487 34.2174 29.9999 33.3333 29.9999H30M10 23.3333H30V36.6666H10V23.3333Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PrinterIcon;
