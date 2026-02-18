export const paginationClassnames = {
  wrapper: "font-header",
  item: [
    "font-pagination",
    "text-gray-700",
    "data-[hover=true]:text-white",
    "data-[hover=true]:bg-gradient-to-r",
    "data-[hover=true]:from-[#BD9673]",
    "data-[hover=true]:to-[#7D5E42]",
    "transition-colors duration-200",
  ].join(" "),
  cursor: [
    "font-pagination",
    "bg-gradient-to-r from-[#BD9673] to-[#7D5E42]",
    "text-white",
    "font-bold",
    "shadow-lg",
  ].join(" "),
};
