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
import { SwipeBookViewer, SwipeBookViewerHandle } from "./components/SwipeBookViewer";
import { updateStack } from "@/actions/actions";
import { smoothScrollTo } from "@/lib/smooth-scroll";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type StackUpdatedPayload = {
  stackId: string;
  songs: any[];
  mealType: string | null;
  programSelected?: string[];
};

type SongPageEntry = {
  isReserve: boolean;
  pageOffset: number;
  pageCount: number;
  kind: "song" | "trapeza-start" | "trapeza-end";
  reprises?: { fromPage: number; toPage: number }[];
  songId?: string;
};

type SongPageData = { pageOffset: number; pageCount: number };

export default function Page() {
  const [showButton, setShowButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isSinger = sessionStatus === "loading" ? true : session?.user?.role !== "регент";
  const isSingerRef = useRef(isSinger);
  isSingerRef.current = isSinger;

  const [viewMode, setViewMode] = useState<"scroll" | "book">("scroll");
  const [viewerHeight, setViewerHeight] = useState(() =>
    typeof window !== "undefined" ? Math.max(400, window.innerHeight) : 600
  );
  const viewModeRef = useRef<"scroll" | "book">("scroll");

  // SwipeBook viewer ref — lets us call goToPage / getActivePage
  const flipViewerRef = useRef<SwipeBookViewerHandle>(null);

  // Данные страниц по songId — не зависят от порядка в массиве, поэтому перестановка не ломает pageCount
  const [songPageDataById, setSongPageDataById] = useState<Map<string, SongPageData>>(new Map());
  const [trapezaStartPage, setTrapezaStartPage] = useState<number | undefined>();
  const [trapezaEndPage, setTrapezaEndPage] = useState<number | undefined>();
  const [trapezaStartPageCount, setTrapezaStartPageCount] = useState<number | undefined>();
  const [trapezaEndPageCount, setTrapezaEndPageCount] = useState<number | undefined>();
  const [contentRanges, setContentRanges] = useState<{ offset: number; count: number }[]>([]);
  const [pdfData, setPdfData] = useState<ArrayBuffer | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  // absoluteFromPage → { absoluteTo (для прыжка), relativeTo (для отображения внутри файла) }
  const [repriseMap, setRepriseMap] = useState<Map<number, { absoluteTo: number; relativeTo: number }>>(new Map());

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
      if (payload.programSelected) setProgramSelected(payload.programSelected);
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

  // Определяем текущую абсолютную страницу в режиме скролла
  const updateCurrentPageFromScroll = useCallback(() => {
    if (viewModeRef.current === "book") return;
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
    const el = pages[activeIndex];
    if (el) setCurrentPage(parseInt(el.dataset.pageNumber || "1", 10));
  }, []);

  // Прыжок на абсолютную страницу (репризы)
  const goToReprisePage = useCallback((toPage: number) => {
    if (viewModeRef.current === "book") {
      flipViewerRef.current?.goToPage(toPage);
      return;
    }
    const scope = viewerContainerRef.current;
    if (!scope) return;
    const target = scope.querySelector<HTMLElement>(`[data-page-number="${toPage}"]`);
    if (target) {
      const y = target.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(y);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY <= 60) {
        // У самого верха — кнопки всегда видны
        setShowButton(true);
      } else if (currentY < lastScrollY) {
        setShowButton(true);
      } else if (currentY > lastScrollY) {
        setShowButton(false);
      }
      setLastScrollY(currentY);
      updateCurrentPageFromScroll();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY, updateCurrentPageFromScroll]);

  const mainSongs = stackSongs.filter((s) => !s.isReserve);
  const reserveSongs = stackSongs.filter((s) => s.isReserve);

  // Индексные массивы для SideBarStack — вычисляются из Map по текущему порядку
  const mainSongPages    = mainSongs.map((s) => songPageDataById.get(s._id)?.pageOffset);
  const reserveSongPages = reserveSongs.map((s) => songPageDataById.get(s._id)?.pageOffset);

  // Строим карту репризов из данных X-Song-Pages (содержат свежие репризы из БД)
  const [songPageEntries, setSongPageEntries] = useState<SongPageEntry[]>([]);

  useEffect(() => {
    if (songPageEntries.length === 0) return;
    const entries: [number, { absoluteTo: number; relativeTo: number }][] = [];
    for (const e of songPageEntries) {
      if (e.kind !== "song") continue;
      for (const r of ((e as any).reprises ?? [])) {
        entries.push([
          e.pageOffset + r.fromPage - 1,
          { absoluteTo: e.pageOffset + r.toPage - 1, relativeTo: r.toPage },
        ]);
      }
    }
    setRepriseMap(new Map(entries));
  }, [songPageEntries]);

  // Версия PDF — инициализируется из updatedAt стека, чтобы при открытии страницы
  // не использовался устаревший серверный кэш со старым порядком песен.
  // Для старых стеков без updatedAt используем Date.now() как гарантированно уникальное значение.
  const [pdfVersion, setPdfVersion] = useState<number>(
    () => (stackResponse.doc as any)?.updatedAt || Date.now()
  );
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

    // Сбрасываем устаревшие данные страниц немедленно — новые придут после перестройки PDF.
    // Это предотвращает переход на неправильные страницы при изменении порядка песен.
    setSongPageDataById(new Map());
    setSongPageEntries([]);
    setContentRanges([]);
    setTrapezaStartPage(undefined);
    setTrapezaEndPage(undefined);
    setTrapezaStartPageCount(undefined);
    setTrapezaEndPageCount(undefined);

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!isSingerRef.current) {
        // Только регент сохраняет в БД
        try {
          justSavedRef.current = true;
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
      }
      setPdfVersion(Date.now());
    }, isSingerRef.current ? 1200 : 800); // певчие ждут дольше, чтобы регент успел сохранить в БД

    return () => clearTimeout(autoSaveTimer.current);
  }, [stackSongs, mealType, programSelected, stackId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Применяет SongPageEntry[] к стейту (без скачивания тела PDF) */
  const applySongPageEntries = useCallback((entries: SongPageEntry[]) => {
    setSongPageEntries(entries);
    // Строим Map<songId, {pageOffset, pageCount}> — не зависит от позиции в массиве
    const dataMap = new Map<string, SongPageData>();
    for (const e of entries) {
      if (e.kind === "song" && e.songId) {
        dataMap.set(e.songId, { pageOffset: e.pageOffset, pageCount: e.pageCount });
      }
    }
    setSongPageDataById(dataMap);
    const ts = entries.find((e) => e.kind === "trapeza-start");
    const te = entries.find((e) => e.kind === "trapeza-end");
    setTrapezaStartPage(ts?.pageOffset);
    setTrapezaEndPage(te?.pageOffset);
    setTrapezaStartPageCount(ts?.pageCount);
    setTrapezaEndPageCount(te?.pageCount);
    setContentRanges(entries.map((e) => ({ offset: e.pageOffset, count: e.pageCount })));
  }, []);

  // Fetch song page offsets + кешируем байты PDF чтобы не скачивать дважды
  useEffect(() => {
    if (!mergedPdfUrl) return;
    setPdfData(undefined);
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async (attempt = 0) => {
      try {
        const res = await fetch(mergedPdfUrl);
        if (cancelled) return;
        if (!res.ok) {
          if (attempt < 5) retryTimer = setTimeout(() => load(attempt + 1), 2000);
          return;
        }
        const header = res.headers.get("x-song-pages");
        const bytes = await res.arrayBuffer();
        if (cancelled) return;
        setPdfData(bytes);
        if (!header) return;
        applySongPageEntries(JSON.parse(header));
      } catch {
        if (!cancelled && attempt < 5) retryTimer = setTimeout(() => load(attempt + 1), 2000);
      }
    };

    load();
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
  }, [mergedPdfUrl, applySongPageEntries]);

  // Обновляем репризы когда пользователь возвращается на вкладку
  // (репризы могли измениться в карточке песни без изменения состава стопки)
  useEffect(() => {
    if (!mergedPdfUrl) return;
    const refresh = async () => {
      try {
        const res = await fetch(mergedPdfUrl, { cache: "no-store" });
        const header = res.headers.get("x-song-pages");
        // Отменяем тело — нам нужны только заголовки
        res.body?.cancel().catch(() => {});
        if (header) applySongPageEntries(JSON.parse(header));
      } catch {}
    };
    const handleVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [mergedPdfUrl, applySongPageEntries]);

  // Navigate flipbook one page at a time (even in double-page spread mode)
  const scrollToPageByStep = useCallback((step: -1 | 1) => {
    if (viewModeRef.current === "book") {
      flipViewerRef.current?.navigateStep(step);
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
    const targetEl = pages[targetIndex];
    if (targetEl) {
      const y = targetEl.getBoundingClientRect().top + window.scrollY;
      smoothScrollTo(y);
    }
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

  // Prevent window scroll in book mode; also block iOS Safari edge-swipe navigation
  useEffect(() => {
    const inBook = viewMode === "book";
    document.body.style.overflow = inBook ? "hidden" : "";
    document.documentElement.style.overscrollBehavior = inBook ? "none" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [viewMode]);

  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const startHideTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowButton(false), 3000);
  }, []);

  const handleBookTap = useCallback(() => {
    setShowButton((v) => {
      const next = !v;
      clearTimeout(hideTimer.current);
      if (next) startHideTimer();
      return next;
    });
  }, [startHideTimer]);

  const handleViewModeChange = useCallback((mode: "scroll" | "book") => {
    if (mode === "book") {
      // Показать кнопки при входе и запустить автоскрытие
      setShowButton(true);
      startHideTimer();
    } else {
      clearTimeout(hideTimer.current);
      setShowButton(true);
    }
    setViewMode(mode);
  }, [startHideTimer]);

  const handleGoToPage = useCallback((page: number) => {
    flipViewerRef.current?.goToPage(page);
  }, []);

  return (
    <div>
      {/* Book mode overlay */}
      {viewMode === "book" && mergedPdfUrl && (
        <div className="fixed inset-0 z-20 bg-[#F7F4F1] flex flex-col">
          <div className="flex-1 overflow-hidden">
            <SwipeBookViewer
              ref={flipViewerRef}
              pdfUrl={mergedPdfUrl}
              pdfData={pdfData}
              height={viewerHeight}
              contentRanges={contentRanges}
              onTap={handleBookTap}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {viewMode === "scroll" && <ScrollToTop />}
      {!isSinger && (
        <ClickerIndicator isConnected={clickerConnected} hidden={!showButton} />
      )}

      {/* Кнопка репризы — снизу по центру экрана */}
      {repriseMap.has(currentPage) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => goToReprisePage(repriseMap.get(currentPage)!.absoluteTo)}
            className="flex items-center gap-1.5 bg-[#7D5E42] text-white text-sm font-medium px-3 py-2 rounded-xl shadow-lg active:scale-95 transition-transform"
            title={`Реприза: перейти на стр. ${repriseMap.get(currentPage)?.relativeTo}`}
          >
            {/* Знак репризы: две вертикальные черты + две точки */}
            <svg width="13" height="18" viewBox="0 0 13 18" fill="currentColor">
              <rect x="0" y="0" width="4" height="18" rx="0.5" />
              <rect x="5.5" y="0" width="2" height="18" rx="0.5" />
              <circle cx="10.5" cy="6" r="2" />
              <circle cx="10.5" cy="12" r="2" />
            </svg>
            стр. {repriseMap.get(currentPage)?.relativeTo}
          </button>
        </div>
      )}

      <SideBarStack
        onPreview={handlePreview}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        goToPage={handleGoToPage}
        mainSongPages={mainSongPages}
        reserveSongPages={reserveSongPages}
        trapezaStartPage={trapezaStartPage}
        trapezaEndPage={trapezaEndPage}
        forceVisible={showButton}
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
      <SongsList
        songs={mainSongs}
        isReserved={false}
        songPageDataById={songPageDataById}
        trapezaStartOffset={trapezaStartPage}
        trapezaEndOffset={trapezaEndPage}
        trapezaStartPageCount={trapezaStartPageCount}
        trapezaEndPageCount={trapezaEndPageCount}
      />

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
              songPageDataById={songPageDataById}
            />
          </div>
        </>
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
