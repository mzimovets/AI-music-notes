"use client";
import { title } from "@/components/primitives";
import React, { use } from "react";
import {
  Card,
  Input,
  Chip,
  User,
  Tooltip,
  CardBody,
  CardFooter,
  CardHeader,
  Button,
  Image,
} from "@heroui/react";
import PlaylistLayout from "./layout";
import { SearchIcon } from "@/components/icons";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { useRouter } from "next/navigation";
import { Monogram } from "@/components/monogram";
import { LeftArr } from "@/components/LeftArr";
import { categorySongs } from "@/components/constants";

export const columns = [
  // Добавить еще автора слов (Слова: Маршака)
  // Разбить колонки на обработка, аранжировка
  { name: "НАЗВАНИЕ", uid: "name" },
  { name: "АВТОР", uid: "role" },
  { name: "ДЕЙСТВИЕ", uid: "actions" },
];

export const users = [
  {
    id: 1,
    name: "Tony Reichert",
    role: "CEO",
  },
  {
    id: 2,
    name: "Zoey Lang",
    role: "Technical Lead",
  },
  {
    id: 3,
    name: "Jane Fisher",
  },
  {
    id: 4,
    name: "William Howard",
    role: "Community Manager",
  },
  {
    id: 5,
    name: "Kristen Copper",
    role: "Sales Manager",
  },
];

export const EyeIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 20 20"
      width="1em"
      {...props}
    >
      <path
        d="M12.9833 10C12.9833 11.65 11.65 12.9833 10 12.9833C8.35 12.9833 7.01666 11.65 7.01666 10C7.01666 8.35 8.35 7.01666 10 7.01666C11.65 7.01666 12.9833 8.35 12.9833 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M9.99999 16.8916C12.9417 16.8916 15.6833 15.1583 17.5917 12.1583C18.3417 10.9833 18.3417 9.00831 17.5917 7.83331C15.6833 4.83331 12.9417 3.09998 9.99999 3.09998C7.05833 3.09998 4.31666 4.83331 2.40833 7.83331C1.65833 9.00831 1.65833 10.9833 2.40833 12.1583C4.31666 15.1583 7.05833 16.8916 9.99999 16.8916Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const DeleteIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 20 20"
      width="1em"
      {...props}
    >
      <path
        d="M17.5 4.98332C14.725 4.70832 11.9333 4.56665 9.15 4.56665C7.5 4.56665 5.85 4.64998 4.2 4.81665L2.5 4.98332"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M7.08331 4.14169L7.26665 3.05002C7.39998 2.25835 7.49998 1.66669 8.90831 1.66669H11.0916C12.5 1.66669 12.6083 2.29169 12.7333 3.05835L12.9166 4.14169"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M15.7084 7.61664L15.1667 16.0083C15.075 17.3166 15 18.3333 12.675 18.3333H7.32502C5.00002 18.3333 4.92502 17.3166 4.83335 16.0083L4.29169 7.61664"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M8.60834 13.75H11.3833"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
      <path
        d="M7.91669 10.4167H12.0834"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      />
    </svg>
  );
};

export const EditIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 20 20"
      width="1em"
      {...props}
    >
      <path
        d="M11.05 3.00002L4.20835 10.2417C3.95002 10.5167 3.70002 11.0584 3.65002 11.4334L3.34169 14.1334C3.23335 15.1084 3.93335 15.775 4.90002 15.6084L7.58335 15.15C7.95835 15.0834 8.48335 14.8084 8.74168 14.525L15.5834 7.28335C16.7667 6.03335 17.3 4.60835 15.4583 2.86668C13.625 1.14168 12.2334 1.75002 11.05 3.00002Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
      <path
        d="M9.90833 4.20831C10.2667 6.50831 12.1333 8.26665 14.45 8.49998"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
      <path
        d="M2.5 18.3333H17.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
      />
    </svg>
  );
};

const statusColorMap = {
  active: "success",
  paused: "danger",
  vacation: "warning",
};

export default function PlaylistPage({ params }) {
  const router = useRouter();
  // const category = router.query.category
  const { category } = use(params);
  console.log("category", category);
  const renderCell = React.useCallback((user, columnKey) => {
    const cellValue = user[columnKey];

    switch (columnKey) {
      case "name":
        return (
          <a href="/song">
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize">{cellValue}</p>
              <p className="text-bold text-sm capitalize text-default-400">
                {user.email}
              </p>
            </div>
          </a>
        );
      case "role":
        return (
          <a href="/song">
            <div className="flex flex-col">
              <p className="text-bold text-sm capitalize">{cellValue}</p>
              <p className="text-bold text-sm capitalize text-default-400">
                {user.team}
              </p>
            </div>
          </a>
        );
      case "actions":
        return (
          <div className="relative flex items-center gap-2 justify-center gap-4">
            <Tooltip content="Details">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <EyeIcon />
              </span>
            </Tooltip>
            <Tooltip content="Edit user">
              <span className="text-lg text-default-400 cursor-pointer active:opacity-50">
                <EditIcon />
              </span>
            </Tooltip>
            <Tooltip color="danger" content="Delete user">
              <span className="text-lg text-danger cursor-pointer active:opacity-50">
                <DeleteIcon />
              </span>
            </Tooltip>
          </div>
        );
      default:
        return cellValue;
    }
  }, []);

  return (
    <div>
      <PlaylistLayout>
        <div>
          <div className="relative">
            <Button
              onPress={() => router.push("/")}
              className="absolute left-0 top-0 -ml-86 bg-gradient-to-r from-[#BD9673] to-[#7D5E42] text-white rounded-full px-6 py-2 text-2xl font-normal shadow-md w-auto min-w-0"
            >
              <LeftArr className="h-6 w-6" />
            </Button>

            <div className="flex items-start gap-8 font-header">
              <Card className="w-47.5 h-47.5 flex-shrink-0">
                <Image
                  alt="album cover"
                  className="object-cover"
                  height={200}
                  src="/cover.png"
                  width={200}
                />
              </Card>{" "}
              {/* ← не будет сжиматься */}
              <div className="flex flex-col gap-4 flex-grow">
                {" "}
                {/* ← займет оставшееся пространство */}
                <Card className="py-4">
                  <CardHeader className="pb-0 px-4 flex-col items-start">
                    <p className="font-header -mt-4 pl-1">
                      {categorySongs.find((ctg) => ctg.key == category)?.name ||
                        category}
                    </p>
                    <small className="text-default-500 pl-1">12 песен</small>
                  </CardHeader>
                  <CardBody className="overflow-visible py-2">
                    <Input
                      type="search"
                      placeholder="Поиск"
                      endContent={<SearchIcon className="text-default-400" />}
                      className="w-80 mx-auto ml-2 mb-4"
                      classNames={{
                        inputWrapper: "bg-[#FFFAF5] rounded-md",
                        input: "text-sm",
                      }}
                    />
                    <Monogram className="h-6 w-auto" />
                  </CardBody>
                </Card>
              </div>
            </div>
            <div className="flex justify-center">
              <Table
                aria-label="Example table with custom cells"
                className="mt-4 w-200"
              >
                <TableHeader columns={columns}>
                  {(column) => (
                    <TableColumn
                      key={column.uid}
                      align={column.uid === "actions" ? "center" : "start"}
                    >
                      {column.name}
                    </TableColumn>
                  )}
                </TableHeader>
                <TableBody items={users}>
                  {(item) => (
                    <TableRow key={item.id}>
                      {(columnKey) => (
                        <TableCell>{renderCell(item, columnKey)}</TableCell>
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </PlaylistLayout>
    </div>
  );
}
