import { Button } from "@heroui/button";
import { TrashBinIcon } from "./icons/TrashBinIcon";

export const RemoveSongButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button
      radius="lg"
      size="sm"
      onClick={onClick}
      className="min-w-0 px-3 bg-red-50 text-red-400 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all shadow-none"
    >
      <TrashBinIcon />
    </Button>
  );
};
