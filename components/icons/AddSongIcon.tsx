import React from "react";

export const AddSongIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V9M13 3L19 9M13 3V8C13 8.55228 13.4477 9 14 9H19M12 13V17M14 15H10"
        stroke="currentColor"
        strokeWidth={1.416}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
