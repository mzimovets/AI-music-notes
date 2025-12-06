import { title } from "@/components/primitives";
import HomeContent from "../home/HomeContent";
import PlaylistLayout from "./layout";

export default function PlaylistPage() {
  return (
    <div>
      <h1 className={title()}>Главная</h1>
      <PlaylistLayout>
        <div>content</div>
        <HomeContent />
      </PlaylistLayout>
    </div>
  );
}
