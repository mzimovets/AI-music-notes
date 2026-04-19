"use client";
import { useRef, useCallback, useState, useEffect } from "react";
import { useClicker } from "@/components/useClicker";
import { ClickerIndicator } from "@/components/ClickerIndicator";

import { SideBarStack } from "./components/SideBarStack";

import { useStackContext } from "@/app/stack/[id]/components/StackContextProvider";
import { SongsList } from "./components/SongsList";
import { getPluralForm } from "@/app/stack/[id]/components/GetPluralForm";
import { socket } from "@/lib/socket";
import { StackViewer } from "./components/StackViewer";
import { mealFilesMap } from "@/app/stack/[id]/constants";
import { ScrollToTop } from "@/app/stack/[id]/components/ScrollToTopButton";
import { CloseReadButton } from "@/app/songRead/[id]/components/CloseReadButton";
import ModalFilePreviewer from "@/app/home/modalFilePreviewer";
import { DearFlipViewer, DearFlipViewerHandle, COVER_COLORS } from "./components/DearFlipViewer";
import { updateStack } from "@/actions/actions";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type StackUpdatedPayload = {
  stackId: string;
  songs: any[];
  mealType: string | null;
};

type SongPageEntry = {
  isReserve: boolean;
  pageOffset: number;
  pageCount: number;
  kind: "song" | "trapeza-start" | "trapeza-end";
};

export default function Page() {
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const isSinger = session?.user?.role !== "регент";

  const [viewMode, setViewMode] = useState<"scroll" | "book">("scroll");
  const [viewerHeight, setViewerHeight] = useState(() =>
    typeof window !== "undefined" ? Math.max(400, window.innerHeight) : 600
  );
  const viewModeRef = useRef<"scroll" | "book">("scroll");

  // DearFlip viewer ref — lets us call goToPage / getActivePage
  const flipViewerRef = useRef<DearFlipViewerHandle>(null);

  // Page offsets per song/prayer (fetched once the mergedPdfUrl is known)
  const [mainSongPages, setMainSongPages] = useState<number[]>([]);
  const [reserveSongPages, setReserveSongPages] = useState<number[]>([]);
  const [trapezaStartPage, setTrapezaStartPage] = useState<number | undefined>();
  const [trapezaEndPage, setTrapezaEndPage] = useState<number | undefined>();

  const scrollToReserveSong = (songId: string) => {
    const el = document.getElementById(songId);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleClosePreview = () => setIsPreviewModalOpen(false);
  const handlePreview = (song) => {
    setSelectedFile(`/uploads/${song.file.filename}`);
    setIsPreviewModalOpen(true);
  };

  const {
    stackResponse,
    stackSongs,
    setStackSongs,
    setMealType,
    setProgramSelected,
    programSelected,
    mealType,
  } = useStackContext();

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BASIC_BACK_URL || "http://localhost:4000";

  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const stackId = stackResponse?.doc?._id;

  useEffect(() => {
    if (!stackId) return;

    const joinCurrentStack = () => {
      socket.emit("join-stack", stackId);
    };

    const handleUpdate = (payload: StackUpdatedPayload) => {
      if (!payload || payload.stackId !== stackId) return;
      setStackSongs(payload.songs || []);
      setMealType(payload.mealType || null);
    };

    const handleVisibilityChanged = ({ stackId: changedId, isPublished, deleted }: { stackId: string; isPublished?: boolean; deleted?: boolean }) => {
      if (changedId !== stackId) return;
      if (isSinger && (deleted || isPublished === false)) {
        router.push("/");
      }
    };

    joinCurrentStack();
    socket.on("connect", joinCurrentStack);
    socket.on("stack-updated", handleUpdate);
    socket.on("stack-visibility-changed", handleVisibilityChanged);

    return () => {
      socket.off("connect", joinCurrentStack);
      socket.off("stack-updated", handleUpdate);
      socket.off("stack-visibility-changed", handleVisibilityChanged);
    };
  }, [stackId, setMealType, setStackSongs, isSinger, router]);

  useEffect(() => {
    // Если мы только что сами сохранили — revalidatePath вызвал этот эффект повторно.
    // Пропускаем, чтобы не зациклиться (auto-save → revalidate → setState → auto-save…).
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    setStackSongs(stackResponse.doc?.songs || []);
    setProgramSelected(stackResponse.doc?.programSelected || []);
    setMealType(stackResponse.doc?.mealType || null);
  }, [stackResponse, setMealType, setProgramSelected, setStackSongs]);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY < lastScrollY) setShowButton(true);
      else if (currentY > lastScrollY) setShowButton(false);
      setLastScrollY(currentY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  // Cover colour from the stack's cover image name
  const coverColor = COVER_COLORS[(stackResponse.doc as any)?.cover || ""] || "#BD9673";

  // Версия PDF — увеличивается при изменении состава книги, DearFlip перезагружает PDF
  const [pdfVersion, setPdfVersion] = useState(0);
  const mergedPdfUrl = stackId ? `/api/merge-stack/${stackId}?v=${pdfVersion}` : null;

  // Следим за изменениями состава книги, автосохраняем и обновляем PDF
  const pdfUpdateKeyRef  = useRef<string>("");
  const autoSaveTimer    = useRef<ReturnType<typeof setTimeout>>();
  // Флаг: мы сами только что сохранили — игнорируем входящий stackResponse update
  const justSavedRef     = useRef(false);

  useEffect(() => {
    if (!stackId) return;

    // Ключ учитывает только состав и порядок песен — без нестабильных полей
    const key = JSON.stringify({
      songs: stackSongs.map((s) => ({ id: s._id, isReserve: s.isReserve })),
      mealType,
      hasTrapeza: programSelected.includes("Трапеза"),
    });

    // Первый рендер — запоминаем начальное состояние, не сохраняем
    if (!pdfUpdateKeyRef.current) {
      pdfUpdateKeyRef.current = key;
      return;
    }

    if (key === pdfUpdateKeyRef.current) return;
    pdfUpdateKeyRef.current = key;

    // Дебаунс 800ms — ждём пока пользователь закончит вносить изменения
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        justSavedRef.current = true; // помечаем: следующий stackResponse update — от нас
        await updateStack({
          stack: stackSongs,
          mealType: mealType ?? "",
          programSelected: programSelected as [],
          isPublished: (stackResponse.doc as any)?.isPublished ?? false,
          currentUrl: window.location.pathname,
          name: stackResponse.doc?.name ?? "",
          cover: (stackResponse.doc as any)?.cover ?? "",
          id: stackId,
        });
      } catch (e) {
        justSavedRef.current = false;
        console.error("[book] auto-save failed:", e);
      }
      // Обновляем PDF только если не в режиме книги —
      // иначе книга исчезает при каждом изменении состава.
      // При переключении в режим книги PDF обновляется в handleViewModeChange.
      if (viewModeRef.current !== "book") {
        setPdfVersion((v) => v + 1);
      }
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  }, [stackSongs, mealType, programSelected, stackId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch song page offsets from the response headers of the merge endpoint
  useEffect(() => {
    if (!mergedPdfUrl) return;
    fetch(mergedPdfUrl)
      .then((res) => {
        const header = res.headers.get("x-song-pages");
        if (!header) return;
        const entries: SongPageEntry[] = JSON.parse(header);
        setMainSongPages(
          entries.filter((e) => e.kind === "song" && !e.isReserve).map((e) => e.pageOffset)
        );
        setReserveSongPages(
          entries.filter((e) => e.kind === "song" && e.isReserve).map((e) => e.pageOffset)
        );
        const ts = entries.find((e) => e.kind === "trapeza-start");
        const te = entries.find((e) => e.kind === "trapeza-end");
        setTrapezaStartPage(ts?.pageOffset);
        setTrapezaEndPage(te?.pageOffset);
      })
      .catch(() => {});
  }, [mergedPdfUrl]);

  // Navigate flipbook one page at a time (even in double-page spread mode)
  const scrollToPageByStep = useCallback((step: -1 | 1) => {
    if (viewModeRef.current === "book") {
      const current = flipViewerRef.current?.getActivePage() ?? 1;
      flipViewerRef.current?.goToPage(current + step);
      return;
    }

    const scope = viewerContainerRef.current;
    if (!scope) return;
    const pages = Array.from(scope.querySelectorAll<HTMLElement>("[data-page-number]"));
    if (pages.length === 0) return;

    let activeIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    pages.forEach((page, index) => {
      const distance = Math.abs(page.getBoundingClientRect().top);
      if (distance < minDistance) { minDistance = distance; activeIndex = index; }
    });

    const targetIndex = Math.max(0, Math.min(pages.length - 1, activeIndex + step));
    pages[targetIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const { isConnected: clickerConnected } = useClicker(useCallback((direction) => {
    if (direction === "down") scrollToPageByStep(1);
    if (direction === "up") scrollToPageByStep(-1);
  }, [scrollToPageByStep]));

  // Читаем сохранённый режим из localStorage только после монтирования на клиенте
  useEffect(() => {
    const saved = localStorage.getItem("stackViewMode");
    if (saved === "book" || saved === "scroll") {
      setViewMode(saved);
      viewModeRef.current = saved;
    }
  }, []);

  // Сохраняем выбранный режим при каждом изменении
  useEffect(() => {
    viewModeRef.current = viewMode;
    localStorage.setItem("stackViewMode", viewMode);
  }, [viewMode]);

  // Measure available height for the DearFlip viewer (full screen height)
  useEffect(() => {
    const update = () => setViewerHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Prevent window scroll in book mode
  useEffect(() => {
    document.body.style.overflow = viewMode === "book" ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [viewMode]);

  const handleViewModeChange = useCallback((mode: "scroll" | "book") => {
    if (mode === "book") {
      // При открытии книги всегда загружаем свежий PDF (учитывает все накопленные изменения)
      setPdfVersion((v) => v + 1);
    }
    setViewMode(mode);
  }, []);

  const handleGoToPage = useCallback((page: number) => {
    flipViewerRef.current?.goToPage(page);
  }, []);

  return (
    <div>
      {/* Book mode overlay */}
      {viewMode === "book" && mergedPdfUrl && (
        <div className="fixed inset-0 z-20 bg-[#F7F4F1] flex flex-col">
          <div className="flex-1 overflow-hidden">
            <DearFlipViewer
              ref={flipViewerRef}
              key={mergedPdfUrl}
              pdfUrl={mergedPdfUrl}
              height={viewerHeight}
              coverColor={coverColor}
            />
          </div>
        </div>
      )}

      {viewMode === "scroll" && <ScrollToTop />}
      {!isSinger && <ClickerIndicator isConnected={clickerConnected} />}
      <SideBarStack
        onPreview={handlePreview}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        goToPage={handleGoToPage}
        mainSongPages={mainSongPages}
        reserveSongPages={reserveSongPages}
        trapezaStartPage={trapezaStartPage}
        trapezaEndPage={trapezaEndPage}
      />
      <div
        className={`fixed right-3 top-2 z-50 transform-gpu transition-all duration-200
          ${showButton ? "scale-100 opacity-100" : "scale-0 opacity-0"}
        `}
      >
        <CloseReadButton />
      </div>
      <p className="flex justify-center text-center font-header text-sm sm:text-base md:text-lg font-bold mt-4 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#BD9673] to-[#7D5E42] tracking-wide">
        {stackResponse.doc?.name}
      </p>
      <p
        id={`program`}
        className="flex flex-col text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg"
      >
        Программа
      </p>
      <div className="justify-center flex gap-2 ">
        <p className="text-bold text-sm input-header justify-center text-default-500">
          {mainSongs.length} {getPluralForm(mainSongs.length)}
        </p>
      </div>

      <div ref={viewerContainerRef} data-viewer-container>
      {/* Тропарь */}
      {stackResponse.doc?.programSelected.includes("Трапеза") &&
        mealFilesMap[stackResponse.doc?.mealType] && (
        <StackViewer
          fileUrl={`/meals-pdf/${mealFilesMap[stackResponse.doc.mealType].start.replace("meals-pdf/", "")}`}
        />
      )}

      <SongsList songs={mainSongs} isReserved={false} />

      {reserveSongs.length > 0 && (
        <>
          <p
            id={`reserve`}
            className="flex flex-col mt-2 text-default-500 text-center justify-center font-header gap-2 text-sm sm:text-base md:text-lg"
          >
            Резерв
          </p>

          <div className="justify-center flex gap-2 mb-2">
            <p className="text-bold text-sm input-header justify-center text-default-500">
              {reserveSongs.length} {getPluralForm(reserveSongs.length)}
            </p>
          </div>

          <div className="justify-center gap-2 mb-6">
            <SongsList
              songs={reserveSongs}
              isReserved={true}
              onSongClick={scrollToReserveSong}
            />
          </div>
        </>
      )}
      {/* Кондак */}
      {stackResponse.doc?.programSelected.includes("Трапеза") &&
        mealFilesMap[stackResponse.doc?.mealType] && (
        <StackViewer
          fileUrl={`/meals-pdf/${mealFilesMap[stackResponse.doc.mealType].end.replace("meals-pdf/", "")}`}
        />
      )}
      </div>

      <ModalFilePreviewer
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        selectedFile={selectedFile}
      />
    </div>
  );
}
