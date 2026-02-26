type ActionButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  variant: "green" | "brown" | "red";
};

export const ActionButton = ({
  children,
  onClick,
  variant,
}: ActionButtonProps) => {
  const baseClass =
    "button-edit-font px-3 py-1.5 text-sm rounded-full border transition-all flex gap-1.5 items-center";

  const variants = {
    green:
      "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:border-green-300",
    brown:
      "bg-[#FFFAF5] text-[#7D5E42] border-[#E6D3C2] hover:bg-[#F3E8DE] hover:border-[#BD9673]",
    red: "bg-red-50 text-red-400 border-red-200 hover:bg-red-100 hover:border-red-300",
  };

  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]}`}>
      {children}
    </button>
  );
};
