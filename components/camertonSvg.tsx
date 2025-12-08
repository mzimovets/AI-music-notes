import React from "react";

interface CamertonLogoProps {
  className?: string;
}

export const CamertonLogo: React.FC<CamertonLogoProps> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 30 30"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="camertonGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#BD9673" />
        <stop offset="100%" stopColor="#7D5E42" />
      </linearGradient>
    </defs>
    <path
      d="m 19,4 c -0.6,0 -1,0.4 -1,1 v 10 c 0,1.1 -0.9,2 -2,2 -1.1,0 -2,-0.9 -2,-2 V 5 C 14,4.4 13.6,4 13,4 12.4,4 12,4.4 12,5 v 10 c 0,1.9 1.3,3.4 3,3.9 v 7.4 c -0.6,0.3 -1,1 -1,1.7 0,1.1 0.9,2 2,2 1.1,0 2,-0.9 2,-2 0,-0.7 -0.4,-1.4 -1,-1.7 v -7.4 c 1.7,-0.4 3,-2 3,-3.9 V 5 C 20,4.4 19.6,4 19,4 Z"
      fill="url(#camertonGradient)"
    />
  </svg>
);
