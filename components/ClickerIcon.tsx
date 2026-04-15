interface ClickerIconProps {
  connected: boolean;
  size?: number;
}

export function ClickerIcon({ connected, size = 24 }: ClickerIconProps) {
  const color = connected ? "#22c55e" : "#ef4444";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M36.76,26.31a2,2,0,0,1,0-2.83,18.73,18.73,0,0,1,26.48,0,2,2,0,1,1-2.83,2.83,14.73,14.73,0,0,0-20.82,0A2,2,0,0,1,36.76,26.31Zm5.91,2.11a2,2,0,0,0,2.83,2.82,6.37,6.37,0,0,1,9,0,2,2,0,0,0,1.41.59,2,2,0,0,0,1.42-.59,2,2,0,0,0,0-2.82A10.36,10.36,0,0,0,42.67,28.42Zm22.6,24V66.73a15.27,15.27,0,1,1-30.54,0V52.42a15.27,15.27,0,1,1,30.54,0Zm-4,0a11.27,11.27,0,0,0-22.54,0V66.73a11.27,11.27,0,0,0,22.54,0ZM50,45.59a2,2,0,0,0-2,2v7.6a2,2,0,0,0,4,0v-7.6A2,2,0,0,0,50,45.59Z" />
    </svg>
  );
}
