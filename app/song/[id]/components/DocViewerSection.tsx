"use client";
import { useEffect, useRef } from "react";
import { Card } from "@heroui/card";
import { DocViewer } from "./DocViewer";
import { SongActions } from "./SongActions";
import { EyeSongPageView } from "@/components/EyeSongPageView";

export function DocViewerSection({
  fileUrl,
  songId,
}: {
  fileUrl: string;
  songId: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const section = sectionRef.current;
    if (!card || !section) return;

    const initialCardTop = card.getBoundingClientRect().top;
    let frozen = false;
    let frozenDocTop = 0;

    const onScroll = () => {
      const cardBottom = card.getBoundingClientRect().bottom;
      const sectionBottom = section.getBoundingClientRect().bottom;

      if (!frozen && cardBottom >= sectionBottom) {
        frozen = true;
        frozenDocTop = window.scrollY + card.getBoundingClientRect().top;
      }

      if (frozen) {
        const frozenCardTop = frozenDocTop - window.scrollY;
        if (frozenCardTop >= initialCardTop) {
          frozen = false;
          card.style.top = "";
          return;
        }
        card.style.top = `${frozenCardTop}px`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div ref={sectionRef} className="relative inline-block">
        <DocViewer fileUrl={fileUrl} />
        <EyeSongPageView songId={songId} className="absolute top-4 right-2 z-10" />
      </div>
      <div ref={cardRef} className="fixed left-0 top-70 z-50">
        <Card className="items-center justify-center gap-6 h-50 w-20 p-2 shadow-lg rounded-tr-lg rounded-br-lg rounded-tl-none rounded-bl-none rounded-r-2xl">
          <SongActions />
        </Card>
      </div>
    </>
  );
}
