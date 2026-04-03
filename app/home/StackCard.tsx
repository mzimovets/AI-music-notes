import { Card, Image } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Stack } from "@/lib/types";

export const StackCard = ({ stacks }: { stacks: Stack[] }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";

  const onStackClick = (stack: Stack) => () => {
    if (stack.isPublished) {
      router.push(`/stackView/${stack._id}`);
    } else {
      router.push(`/stack/${stack._id}`);
    }
  };

  const fillCard = (stack: Stack) => (
    <div key={stack._id} className="flex flex-col gap-4 items-center w-full">
      <Card
        onPress={onStackClick(stack)}
        isPressable
        className="w-40 h-40 md:w-50 md:h-50 rounded-xl shadow-md hover:shadow-lg transition-shadow relative"
      >
        {!stack.isPublished ? (
          <div className="z-45 absolute top-12 -right-5 w-[120%] h-6 bg-gradient-to-r from-[#7DE392] to-[#2E7D32] origin-top-right rotate-45 transform overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/30 blur-sm rotate-12"></div>
          </div>
        ) : (
          <div className="z-45 absolute top-12 -right-5 w-[120%] h-6 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] origin-top-right rotate-45 transform overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/30 blur-sm rotate-12"></div>
          </div>
        )}
        {/* Контент карточки */}
        <Image
          className="object-cover w-full h-full"
          alt="Album cover"
          shadow="md"
          src={`/stacks/cover/${stack.cover || "white"}.png`}
          width="100%"
        />
      </Card>

      <p
        onClick={onStackClick(stack)}
        className="text-center font-medium text-xs sm:text-sm card-header line-clamp-2 max-w-[140px] cursor-pointer"
      >
        {stack.name || "Сохраненная"}
      </p>
    </div>
  );

  const filteredStacks = (
    isRegent ? stacks : stacks.filter((stack) => stack.isPublished)
  )
    ?.slice()
    .sort((a, b) => {
      if (a.isPublished === b.isPublished) return 0;
      return a.isPublished ? -1 : 1;
    });

  return filteredStacks?.map((stack) => {
    return fillCard(stack);
  });
};
