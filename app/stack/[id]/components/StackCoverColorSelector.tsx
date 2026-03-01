import { Button, Popover, PopoverContent, PopoverTrigger } from "@heroui/react";
import { ActionButton } from "./ActionButton";
import { ColorIcon } from "./icons/ColorIcon";
import { useStackContext } from "./StackContextProvider";

export const StackCoverColorSelector = () => {
  const { stackResponse, stackCover, setStackCover } = useStackContext();
  const selectedCover = stackCover || stackResponse.doc?.cover || "white";

  return (
    <Popover placement="bottom" showArrow={true}>
      <PopoverTrigger>
        <ActionButton variant="yellow" onClick={() => {}}>
          <ColorIcon />
        </ActionButton>
      </PopoverTrigger>
      <PopoverContent>
        <div className="px-1 py-2">
          <div className="text-small font-bold">
            Выберите цвет обложки стопки
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3 justify-center">
            {[
              { hex: "6b352d", name: "red" },
              { hex: "88799a", name: "purple" },
              { hex: "485110", name: "green" },
              { hex: "2b4659", name: "ocean" },
              { hex: "3c3d38", name: "grey" },
              { hex: "cc671f", name: "orange" },
              { hex: "744624", name: "brown" },
              { hex: "9bad4a", name: "salat" },
              { hex: "d1a600", name: "yellow" },
              { hex: "cacbbd", name: "white" },
              { hex: "6b8caf", name: "blue" },
              { hex: "554454", name: "dark-purple" },
            ].map((color) => (
              <Button
                key={color.hex}
                isIconOnly
                radius="full"
                disableRipple
                onPress={() => setStackCover(color.name)}
                className="!w-8 !h-8 min-w-0 p-0 flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: `#${color.hex}` }}
              >
                {selectedCover === color.name && (
                  <span className="w-3 h-3 rounded-full bg-white" />
                )}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
