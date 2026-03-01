import { Card, Image } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export const StackCard = ({ stacks }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const isRegent = session?.user?.role === "регент";

  const getRandomColor = () => {
    const colors = ["blue", "green", "purple", "red"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const fillCard = (stack) => (
    <div key={stack._id} className="flex flex-col gap-4 items-center w-full">
      <Card
        onPress={() => {
          if (stack.isPublished) {
            router.push(`/stackView/${stack._id}`);
          } else {
            router.push(`/stack/${stack._id}`);
          }
        }}
        isPressable
        className="w-50 h-50 rounded-xl shadow-md hover:shadow-lg transition-shadow relative"
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
          alt="Album cover"
          height={200}
          shadow="md"
          src={`http://localhost:3000/stacks/cover/${stack.cover || "white"}.png`}
          width="100%"
        />
      </Card>

      <p className="text-center font-medium text-xs sm:text-sm card-header line-clamp-2 max-w-[140px]">
        {/* {post.name} */}
        {stack.name || "Сохраненная"}
      </p>
    </div>
  );

  const filteredStacks = isRegent
    ? stacks
    : stacks?.filter((stack) => stack.isPublished);

  return filteredStacks?.map((stack) => {
    return fillCard(stack);
  });

  // return (
  //   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 justify-items-center">
  //     <div className="flex flex-col gap-4 items-center w-full">
  //       <Card
  //         // onPress={() => router.push(`/playlist/${post.key}`)}
  //         isPressable
  //         className="w-50 h-50 rounded-xl shadow-md hover:shadow-lg transition-shadow relative"
  //       >
  //         {/* Зеленая диагональная линия с блеском */}
  //         <div className="absolute top-12 -right-5 w-[120%] h-6 bg-gradient-to-r from-[#7DE392] to-[#2E7D32] origin-top-right rotate-45 transform overflow-hidden">
  //           <div className="absolute top-0 left-0 w-full h-full bg-white/30 blur-sm rotate-12"></div>
  //         </div>
  //         {/* Контент карточки */}
  //       </Card>

  //       <p className="mt-2 text-center font-medium text-xs sm:text-sm card-header line-clamp-2 max-w-[140px]">
  //         {/* {post.name} */}
  //         Сохраненная
  //       </p>
  //     </div>
  //     <div className="flex flex-col gap-4 items-center w-full">
  //       <Card
  //         // onPress={() => router.push(`/playlist/${post.key}`)}
  //         isPressable
  //         className="w-50 h-50 rounded-xl shadow-md hover:shadow-lg transition-shadow relative"
  //       >
  //         {/* Коричневая диагональная линия с блеском */}
  //         <div className="absolute top-12 -right-5 w-[120%] h-6 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] origin-top-right rotate-45 transform overflow-hidden">
  //           <div className="absolute top-0 left-0 w-full h-full bg-white/30 blur-sm rotate-12"></div>
  //         </div>

  //         {/* Контент карточки */}
  //       </Card>
  //       <p className="mt-2 text-center font-medium text-xs sm:text-sm card-header line-clamp-2 max-w-[140px]">
  //         {/* {post.name} */}
  //         Опубликованная
  //       </p>
  //     </div>
  //   </div>
  // );
};
