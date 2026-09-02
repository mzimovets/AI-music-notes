import SidebarIcon from "@/app/stack/[id]/components/icons/SidebarIcon";
import { Button } from "@heroui/button";

type SidebarButtonProps = {
  onPress?: () => void;
};

export const SidebarButton = ({ onPress }: SidebarButtonProps) => {
  return (
    // Нажимаемая область (56px) намеренно больше видимого кружка (40px):
    // react-aria отменяет нажатие, если палец в момент отпускания вышел за
    // границы элемента, и по краю маленькой кнопки это происходило постоянно.
    // Запас прозрачный — внешне кнопка прежняя (см. также CloseButton)
    <Button
      isIconOnly
      // Одни значки без подписи: без имени кнопку не назовёт программа чтения
      // с экрана и не найдёт проверка (см. также CloseButton)
      aria-label="Список песен программы"
      type="button"
      onPress={onPress}
      disableRipple
      variant="light"
      radius="full"
      disableAnimation
      className="group w-14 h-14 min-w-0 p-0 !bg-transparent !shadow-none border-0 data-[hover=true]:!bg-transparent data-[pressed=true]:!bg-transparent flex items-center justify-center"
    >
      <span
        className="
        flex items-center justify-center
        w-10 h-10
        rounded-full
        bg-white/30
        backdrop-blur-lg
        border border-white/40
        shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_18px_rgba(0,0,0,0.10)]
        transition-all duration-200
        group-hover:bg-white/40
        group-hover:shadow-[0_2px_5px_rgba(0,0,0,0.10),0_10px_24px_rgba(0,0,0,0.14)]
        group-active:scale-95
      "
      >
        <SidebarIcon className="w-5 h-5 text-black/70 group-hover:text-black transition-colors" />
      </span>
    </Button>
  );
};
