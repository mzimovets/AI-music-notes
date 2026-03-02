import React from "react";

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "green" | "brown" | "red" | "yellow";
};

export const ActionButton = React.forwardRef<
  HTMLButtonElement,
  ActionButtonProps
>(({ children, onClick, variant, className, ...props }, ref) => {
  const baseClass =
    "button-edit-font px-3 py-1.5 text-sm rounded-full border transition-all flex gap-1.5 items-center";

  const variants = {
    green:
      "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:border-green-300",
    brown:
      "bg-[#FFFAF5] text-[#7D5E42] border-[#E6D3C2] hover:bg-[#F3E8DE] hover:border-[#BD9673]",
    red: "bg-red-50 text-red-400 border-red-200 hover:bg-red-100 hover:border-red-300",
    yellow:
      "bg-yellow-50 text-yellow-400 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300",
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`${baseClass} ${variants[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
});

ActionButton.displayName = "ActionButton";
