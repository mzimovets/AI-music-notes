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
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 5L4.99998 19M5.00001 5L19 19"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
};
