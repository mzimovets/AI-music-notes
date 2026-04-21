import React from "react";

type CloseIconProps = {
  size?: number;
  color?: string;
  className?: string;
};

export const CloseIcon: React.FC<CloseIconProps> = ({
  size = 24,
  color = "currentColor",
  className,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19 5L4.99998 19M5.00001 5L19 19"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
