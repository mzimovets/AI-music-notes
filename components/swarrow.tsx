import React from "react";

interface SwarrowIconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
}

interface SwarrowIconWithCircleProps extends SwarrowIconProps {
  circleColor?: string;
  circleSize?: number;
  showCircle?: boolean;
}

export const SwarrowIcon: React.FC<SwarrowIconProps> = ({
  className = "",
  width = 38,
  height = 10,
  color = "#9A7A5F",
}) => {
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      viewBox="0 0 38 10"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M38 5.067s-2.11 10.825-16.365.403a1.484 1.484 0 01-1.144.53 1.457 1.457 0 01-1.05-.437 1.516 1.516 0 01.003-2.135A1.471 1.471 0 0120.5 3a1.456 1.456 0 011.057.434 1.515 1.515 0 01.424.834c3.23-2.306 13.48-8.742 16.019.8zm-3.41-.06a.537.537 0 00-.17-.38.576.576 0 00-.396-.157.575.575 0 00-.396.15.536.536 0 00-.17.378c.003.143.063.28.17.38.105.1.247.157.396.157a.568.568 0 00.39-.145.53.53 0 00.175-.366v-.017zm-9.919 0s.96 3.35 7.764 0l-.068-.033c-.688-.342-6.364-3.163-7.696.024v.009zM19 5.022C19.083 5.004 14.025 1 14.025 1 13.464 2.22 1.659 4.676.157 4.99L0 5.021c-.002 0 .113.025.322.068C2.364 5.514 13.463 7.818 13.99 9c0 0 4.924-3.96 5.008-3.978z"
        fill={color}
        fillRule="evenodd"
      />
    </svg>
  );
};

// Альтернативный вариант с использованием currentColor
export const SwarrowIconAlt: React.FC<SwarrowIconProps> = ({
  className = "",
  width = 38,
  height = 10,
  color,
}) => {
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      style={color ? { color } : undefined}
      viewBox="0 0 38 10"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        d="M38 5.067s-2.11 10.825-16.365.403a1.484 1.484 0 01-1.144.53 1.457 1.457 0 01-1.05-.437 1.516 1.516 0 01.003-2.135A1.471 1.471 0 0120.5 3a1.456 1.456 0 011.057.434 1.515 1.515 0 01.424.834c3.23-2.306 13.48-8.742 16.019.8zm-3.41-.06a.537.537 0 00-.17-.38.576.576 0 00-.396-.157.575.575 0 00-.396.15.536.536 0 00-.17.378c.003.143.063.28.17.38.105.1.247.157.396.157a.568.568 0 00.39-.145.53.53 0 00.175-.366v-.017zm-9.919 0s.96 3.35 7.764 0l-.068-.033c-.688-.342-6.364-3.163-7.696.024v.009zM19 5.022C19.083 5.004 14.025 1 14.025 1 13.464 2.22 1.659 4.676.157 4.99L0 5.021c-.002 0 .113.025.322.068C2.364 5.514 13.463 7.818 13.99 9c0 0 4.924-3.96 5.008-3.978z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
};

// Вариант с градиентом
export const SwarrowIconGradient: React.FC<
  SwarrowIconProps & {
    gradientStart?: string;
    gradientEnd?: string;
  }
> = ({
  className = "",
  width = 38,
  height = 10,
  gradientStart = "#BD9673",
  gradientEnd = "#7D5E42",
}) => {
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      viewBox="0 0 38 10"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="swarrowGradient" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      <path
        clipRule="evenodd"
        d="M38 5.067s-2.11 10.825-16.365.403a1.484 1.484 0 01-1.144.53 1.457 1.457 0 01-1.05-.437 1.516 1.516 0 01.003-2.135A1.471 1.471 0 0120.5 3a1.456 1.456 0 011.057.434 1.515 1.515 0 01.424.834c3.23-2.306 13.48-8.742 16.019.8zm-3.41-.06a.537.537 0 00-.17-.38.576.576 0 00-.396-.157.575.575 0 00-.396.15.536.536 0 00-.17.378c.003.143.063.28.17.38.105.1.247.157.396.157a.568.568 0 00.39-.145.53.53 0 00.175-.366v-.017zm-9.919 0s.96 3.35 7.764 0l-.068-.033c-.688-.342-6.364-3.163-7.696.024v.009zM19 5.022C19.083 5.004 14.025 1 14.025 1 13.464 2.22 1.659 4.676.157 4.99L0 5.021c-.002 0 .113.025.322.068C2.364 5.514 13.463 7.818 13.99 9c0 0 4.924-3.96 5.008-3.978z"
        fill="url(#swarrowGradient)"
        fillRule="evenodd"
      />
    </svg>
  );
};

// Вариант с кругом под стрелкой (использует HTML div для круга)
export const SwarrowIconWithCircle: React.FC<SwarrowIconWithCircleProps> = ({
  className = "",
  width = 38,
  height = 10,
  color = "#9A7A5F",
  circleColor = "#D9D9D9",
  circleSize = 20,
  showCircle = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      {showCircle && (
        <div
          className="absolute rounded-full"
          style={{
            width: circleSize,
            height: circleSize,
            backgroundColor: circleColor,
          }}
        />
      )}
      <div className="relative z-10">
        <SwarrowIcon color={color} height={height} width={width} />
      </div>
    </div>
  );
};

// Вариант с кругом внутри одного SVG
export const SwarrowIconCircleInline: React.FC<SwarrowIconWithCircleProps> = ({
  className = "",
  width = 38,
  height = 10,
  color = "#9A7A5F",
  circleColor = "#D9D9D9",
  circleSize = 40,
}) => {
  const svgWidth = circleSize;
  const svgHeight = circleSize;

  return (
    <svg
      className={className}
      fill="none"
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width={svgWidth}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Круг */}
      <circle
        cx={svgWidth / 2}
        cy={svgHeight / 2}
        fill={circleColor}
        r={circleSize / 2}
      />

      {/* Стрелка поверх круга */}
      <g
        transform={`translate(${(svgWidth - Number(width)) / 2}, ${(svgHeight - Number(height)) / 2})`}
      >
        <path
          clipRule="evenodd"
          d="M38 5.067s-2.11 10.825-16.365.403a1.484 1.484 0 01-1.144.53 1.457 1.457 0 01-1.05-.437 1.516 1.516 0 01.003-2.135A1.471 1.471 0 0120.5 3a1.456 1.456 0 011.057.434 1.515 1.515 0 01.424.834c3.23-2.306 13.48-8.742 16.019.8zm-3.41-.06a.537.537 0 00-.17-.38.576.576 0 00-.396-.157.575.575 0 00-.396.15.536.536 0 00-.17.378c.003.143.063.28.17.38.105.1.247.157.396.157a.568.568 0 00.39-.145.53.53 0 00.175-.366v-.017zm-9.919 0s.96 3.35 7.764 0l-.068-.033c-.688-.342-6.364-3.163-7.696.024v.009zM19 5.022C19.083 5.004 14.025 1 14.025 1 13.464 2.22 1.659 4.676.157 4.99L0 5.021c-.002 0 .113.025.322.068C2.364 5.514 13.463 7.818 13.99 9c0 0 4.924-3.96 5.008-3.978z"
          fill={color}
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
};

// Простой вариант с Tailwind классами
export const SwarrowIconCircleSimple: React.FC<SwarrowIconWithCircleProps> = ({
  className = "",
  width = 38,
  height = 10,
  color = "#9A7A5F",
  circleColor = "#D9D9D9",
}) => {
  return (
    <div
      className={`relative w-12 h-12 flex items-center justify-center ${className}`}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: circleColor }}
      />
      <SwarrowIcon
        className="relative z-10"
        color={color}
        height={height}
        width={width}
      />
    </div>
  );
};

export default SwarrowIcon;
