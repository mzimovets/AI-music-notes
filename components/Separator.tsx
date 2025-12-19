import React from "react";

interface SeparatorProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  fill?: string;
}

const Separator: React.FC<SeparatorProps> = ({
  width = 17,
  height = 10,
  className = "",
  fill = "url(#paint0_linear_206_4326)",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 17 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M0 5.06734C0 5.06734 2.17212 16.2119 17 4.99806C17 5.01538 3.02481 -6.30233 0 5.06734ZM3.41079 5.00673C3.41314 4.86355 3.47376 4.727 3.57955 4.62656C3.68534 4.52612 3.8278 4.46983 3.97623 4.46985C4.04932 4.4687 4.12192 4.48146 4.18989 4.50738C4.25786 4.53331 4.31989 4.5719 4.3724 4.62095C4.42491 4.67 4.46688 4.72855 4.49594 4.79326C4.52499 4.85797 4.54054 4.92756 4.54171 4.99807C4.53935 5.14125 4.47874 5.27779 4.37295 5.37823C4.26716 5.47867 4.12466 5.53496 3.97623 5.53494C3.83165 5.53736 3.69178 5.48537 3.58623 5.39001C3.48068 5.29465 3.41776 5.16339 3.41079 5.02404V5.00673ZM13.3289 5.00672C13.3289 5.00672 12.3685 8.35788 5.56495 5.00673C5.56495 5.02404 11.9108 1.60362 13.3289 4.99806V5.00672Z"
        fill={fill}
      />
      <defs>
        <linearGradient
          id="paint0_linear_206_4326"
          x1="0.972458"
          y1="3.43137"
          x2="17.0339"
          y2="3.72308"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C9A885" />
          <stop offset="1" stopColor="#9A7A5F" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Separator;
