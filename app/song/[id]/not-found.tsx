import Link from "next/link";
import { Monogram } from "@/components/monogram";

export default function SongNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center font-header px-4 pt-20">
      <p>Эта партитура удалена или не найдена</p>
      <Link href="/" className="text-sm underline text-[#7D5E42]">
        На главную
      </Link>
      <Monogram className="mt-10 h-7" />
    </div>
  );
}
