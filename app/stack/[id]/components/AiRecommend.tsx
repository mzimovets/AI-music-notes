"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Input,
} from "@heroui/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useStackContext } from "./StackContextProvider";
import { useAllSongsLibraryContextProvider } from "@/app/providers";
import { useLocalServer } from "@/hooks/useLocalServer";
import { ServerSong } from "@/lib/types";

// ─── Типы ───────────────────────────────────────────────────────────────────

interface AiSong {
  id: string;
  name: string;
  author: string;
  section: string;
  reason: string;
  matched?: ServerSong | null;
}

// ─── Цвета категорий ─────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  "военные":  { border: "#b45309", text: "#b45309", bg: "#fef3c7" },
  "духовные": { border: "#6d28d9", text: "#6d28d9", bg: "#ede9fe" },
  "детские":  { border: "#0369a1", text: "#0369a1", bg: "#dbeafe" },
  "советские":{ border: "#065f46", text: "#065f46", bg: "#d1fae5" },
};
const DEFAULT_STYLE = { border: "#BD9673", text: "#7D5E42", bg: "#FFF5EB" };

function getCategoryStyle(category?: string | null) {
  if (!category) return DEFAULT_STYLE;
  return CATEGORY_STYLE[category.toLowerCase()] ?? DEFAULT_STYLE;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function matchSong(name: string, library: ServerSong[]): ServerSong | null {
  // Убираем кавычки, скобки с содержимым, лишние пробелы, приводим к нижнему регистру
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[«»"'„"]/g, "")
      .replace(/\(.*?\)/g, "") // убираем скобки (Опустела без тебя земля)
      .replace(/[^а-яёa-z0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const target = normalize(name);

  // 1. Точное совпадение после нормализации
  const exact = library.find((s) => normalize(s.name) === target);
  if (exact) return exact;

  // 2. Библиотека содержит запрос или наоборот
  const partial = library.find((s) => {
    const n = normalize(s.name);
    return n.includes(target) || target.includes(n);
  });
  if (partial) return partial;

  // 3. Все слова запроса встречаются в названии
  const words = target.split(" ").filter((w) => w.length > 2);
  if (words.length > 0) {
    const fuzzy = library.find((s) => {
      const n = normalize(s.name);
      return words.every((w) => n.includes(w));
    });
    if (fuzzy) return fuzzy;
  }

  return null;
}

function genInstanceId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Карточка песни ──────────────────────────────────────────────────────────

function SortableAiCard({
  song,
  index,
  onReplace,
}: {
  song: AiSong;
  index: number;
  onReplace: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

  const category = song.matched?.category;
  const cat = getCategoryStyle(category);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        position: "relative",
        marginBottom: 8,
      }}
    >
      <div style={{
        borderRadius: 14,
        background: "#fff",
        boxShadow: isDragging ? "0 8px 28px rgba(80,40,10,0.16)" : "0 1px 6px rgba(80,40,10,0.07)",
        transform: isDragging ? "scale(1.01)" : "scale(1)",
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        border: "1px solid rgba(180,140,100,0.13)",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="touch-none"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 10px",
            cursor: "grab",
            gap: 7,
            flexShrink: 0,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="#C4A882" opacity={0.6}>
            <circle cx="2.5" cy="2.5" r="1.5" />
            <circle cx="2.5" cy="8"   r="1.5" />
            <circle cx="2.5" cy="13.5" r="1.5" />
            <circle cx="7.5" cy="2.5" r="1.5" />
            <circle cx="7.5" cy="8"   r="1.5" />
            <circle cx="7.5" cy="13.5" r="1.5" />
          </svg>

          {/* Номер */}
          <div className="main-font" style={{
            width: 28, height: 28,
            borderRadius: "50%",
            background: cat.border,
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            flexShrink: 0,
          }}>
            {index + 1}
          </div>
        </div>

        {/* Основной контент */}
        <div style={{ flex: 1, padding: "12px 8px 12px 2px", minWidth: 0 }}>
          {/* Название */}
          <div className="main-font" style={{
            fontWeight: 700,
            fontSize: 15,
            color: "#1C1009",
            lineHeight: 1.3,
          }}>
            {song.name}
          </div>

          {/* Автор */}
          {"author" in song && song.author && (
            <div className="main-font" style={{
              fontSize: 12,
              color: "#9B8170",
              marginTop: 2,
              lineHeight: 1.3,
            }}>
              {song.author}
            </div>
          )}

          {/* Бейдж категории */}
          {category && (
            <div className="main-font" style={{
              display: "inline-block",
              marginTop: 6,
              padding: "2px 8px",
              borderRadius: 5,
              background: cat.bg,
              color: cat.text,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}>
              {category}
            </div>
          )}

          {/* Обоснование ИИ */}
          {song.reason && (
            <div className="main-font" style={{
              fontSize: 12,
              color: "#7D5E42",
              marginTop: 6,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}>
              {song.reason}
            </div>
          )}

        </div>

        {/* Кнопка замены */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 12px", flexShrink: 0 }}>
          <button
            className="main-font"
            onClick={() => onReplace(song.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              border: "1px solid #DEC9B0",
              background: "#FFFAF5",
              color: "#7D5E42",
              fontSize: 12,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Заменить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Модалка замены ─────────────────────────────────────────────────────────

function ReplaceModal({
  isOpen,
  onClose,
  library,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  library: ServerSong[];
  onSelect: (song: ServerSong) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = library.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.author ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="input-header text-sm">Выберите песню</ModalHeader>
        <ModalBody className="pb-4">
          <Input
            placeholder="Поиск..."
            value={search}
            onValueChange={setSearch}
            size="sm"
            className="mb-2"
          />
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {filtered.map((song) => (
              <button
                key={song._id}
                onClick={() => { onSelect(song); onClose(); }}
                className="text-left px-3 py-2 rounded-lg hover:bg-[#F3E8DE] transition-colors"
              >
                <p className="input-header text-sm text-[#3B2A1A]">{song.name}</p>
                {song.author && (
                  <p className="text-xs text-default-400">{song.author}</p>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-default-400 text-sm py-4">Ничего не найдено</p>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

// ─── Рендер результатов с DND ────────────────────────────────────────────────

function SortableResults({
  items,
  setItems,
  onReplace,
}: {
  items: AiSong[];
  setItems: React.Dispatch<React.SetStateAction<AiSong[]>>;
  onReplace: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div>
          {items.map((song, idx) => (
            <SortableAiCard
              key={song.id}
              song={song}
              index={idx}
              onReplace={onReplace}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ─── Таб 1: Подобрать репертуар ──────────────────────────────────────────────

interface JournalEntry {
  name: string;
  status: "processing" | "done" | "error";
  hasPdfText?: boolean;
  lyricsPreview?: string;
  lyrics?: string;
  error?: string;
  ts: number;
}

function LibraryAnalyzeButton({ rpiBaseUrl, library }: { rpiBaseUrl: string; library: ServerSong[] }) {
  const total = library.length;
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // Берём актуальный счётчик с сервера, не из stale-данных library
  const [serverStatus, setServerStatus] = useState<{ analyzed: number; total: number } | null>(null);
  const [progress, setProgress] = useState<{ analyzed: number; total: number } | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [fetchedLyrics, setFetchedLyrics] = useState<Record<string, string>>({});
  const lastTsRef = React.useRef(0);

  // Загружаем актуальный статус при монтировании
  React.useEffect(() => {
    fetch(`${rpiBaseUrl}/api/songs/analyze-status`)
      .then((r) => r.json())
      .then((d) => { if (d.status === "ok") setServerStatus({ analyzed: d.analyzed, total: d.total }); })
      .catch(() => {});
  }, [rpiBaseUrl]);

  // Полинг прогресса и журнала пока идёт анализ
  React.useEffect(() => {
    if (!loading && !resetting) { setProgress(null); return; }
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const [statusRes, journalRes] = await Promise.all([
          fetch(`${rpiBaseUrl}/api/songs/analyze-status`),
          fetch(`${rpiBaseUrl}/api/songs/analyze-journal?since=${lastTsRef.current}`),
        ]);
        const statusData = await statusRes.json();
        const journalData = await journalRes.json();
        if (!stopped) {
          if (statusData.status === "ok") setProgress({ analyzed: statusData.analyzed, total: statusData.total });
          if (journalData.status === "ok" && journalData.entries.length > 0) {
            setJournal((prev) => {
              const map = new Map(prev.map((e) => [e.name, e]));
              for (const e of journalData.entries) map.set(e.name, e);
              const next = Array.from(map.values());
              // Если все завершены (нет processing) — останавливаем (даже если есть ошибки)
              const allFinished = next.every((e) => e.status !== "processing");
              if (allFinished) {
                setLoading(false);
                setResetting(false);
              }
              return next;
            });
            lastTsRef.current = journalData.serverTs || journalData.entries[journalData.entries.length - 1].ts;
          }
        }
      } catch {}
      if (!stopped) setTimeout(poll, 1500);
    };
    poll();
    return () => { stopped = true; };
  }, [loading, resetting, rpiBaseUrl]);

  const startBatch = async () => {
    const res = await fetch(`${rpiBaseUrl}/api/songs/analyze-batch`, { method: "POST" });
    const data = await res.json();
    if (data.status !== "ok") throw new Error(data.message);
    return data.queued as number;
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setJournal([]);
    lastTsRef.current = 0;
    setJournalOpen(true);
    try {
      const queued = await startBatch();
      if (queued === 0) {
        // Все уже проанализированы — сразу выключаем loading
        setResult("Все песни уже проанализированы");
        setLoading(false);
      } else {
        setResult(`Запущен анализ ${queued} песен — результаты появляются в журнале`);
      }
    } catch (e: any) {
      setResult(`Ошибка: ${e.message}`);
      setLoading(false);
    }
    // loading сбрасывается когда journal покажет что все готово
  };

  const handleReset = async () => {
    if (!confirm("Сбросить весь анализ и переанализировать все песни заново?")) return;
    setResetting(true);
    setResult(null);
    setJournal([]);
    lastTsRef.current = 0;
    setJournalOpen(true);
    try {
      const resetRes = await fetch(`${rpiBaseUrl}/api/songs/analyze-reset`, { method: "POST" });
      const resetData = await resetRes.json();
      if (resetData.status !== "ok") throw new Error(resetData.message);
      const queued = await startBatch();
      setResult(`Сброс выполнен. Запущен анализ ${queued} песен`);
    } catch (e: any) {
      setResult(`Ошибка: ${e.message}`);
      setResetting(false);
    }
  };

  if (total === 0) return null;

  const busy = loading || resetting;
  const baseAnalyzed = serverStatus?.analyzed ?? library.filter((s) => (s as any).aiSummary).length;
  const displayAnalyzed = progress?.analyzed ?? baseAnalyzed;
  const displayTotal = progress?.total ?? serverStatus?.total ?? total;
  const pct = displayTotal > 0 ? Math.round((displayAnalyzed / displayTotal) * 100) : 0;
  const allDone = displayTotal > 0 && displayAnalyzed >= displayTotal;

  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: 10,
      background: allDone ? "#f0fdf4" : "#fffbeb",
      border: `1px solid ${allDone ? "#bbf7d0" : "#fde68a"}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {busy && (
              <span style={{
                display: "inline-block",
                width: 10, height: 10,
                borderRadius: "50%",
                border: "2px solid #d97706",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
                flexShrink: 0,
              }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>
              {busy ? (resetting ? "Сброс и анализ…" : "Анализирую…") : "Анализ библиотеки"}
            </span>
          </div>

          {busy && progress ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "#92400e", marginBottom: 3 }}>
                {progress.analyzed} из {progress.total} готово
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "#fde68a", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  borderRadius: 2,
                  background: "#d97706",
                  width: `${pct}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
              {displayAnalyzed} из {displayTotal} песен проанализированы ИИ
            </div>
          )}

          {!busy && result && (
            <div style={{ fontSize: 10, color: "#059669", marginTop: 3 }}>{result}</div>
          )}
        </div>

        {!busy && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {displayAnalyzed < displayTotal && (
              <button
                onClick={handleAnalyze}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1px solid #fbbf24",
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Проанализировать ({displayTotal - displayAnalyzed})
              </button>
            )}
            {displayAnalyzed > 0 && (
              <button
                onClick={handleReset}
                title="Сбросить анализ и переанализировать все заново"
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.93077 11.2003C3.00244 6.23968 7.07619 2.25 12.0789 2.25C15.3873 2.25 18.287 3.99427 19.8934 6.60721C20.1103 6.96007 20.0001 7.42199 19.6473 7.63892C19.2944 7.85585 18.8325 7.74565 18.6156 7.39279C17.2727 5.20845 14.8484 3.75 12.0789 3.75C7.8945 3.75 4.50372 7.0777 4.431 11.1982L4.83138 10.8009C5.12542 10.5092 5.60029 10.511 5.89203 10.8051C6.18377 11.0991 6.18191 11.574 5.88787 11.8657L4.20805 13.5324C3.91565 13.8225 3.44398 13.8225 3.15157 13.5324L1.47176 11.8657C1.17772 11.574 1.17585 11.0991 1.46759 10.8051C1.75933 10.5111 2.2342 10.5092 2.52824 10.8009L2.93077 11.2003ZM19.7864 10.4666C20.0786 10.1778 20.5487 10.1778 20.8409 10.4666L22.5271 12.1333C22.8217 12.4244 22.8245 12.8993 22.5333 13.1939C22.2421 13.4885 21.7673 13.4913 21.4727 13.2001L21.0628 12.7949C20.9934 17.7604 16.9017 21.75 11.8825 21.75C8.56379 21.75 5.65381 20.007 4.0412 17.3939C3.82366 17.0414 3.93307 16.5793 4.28557 16.3618C4.63806 16.1442 5.10016 16.2536 5.31769 16.6061C6.6656 18.7903 9.09999 20.25 11.8825 20.25C16.0887 20.25 19.4922 16.9171 19.5625 12.7969L19.1546 13.2001C18.86 13.4913 18.3852 13.4885 18.094 13.1939C17.8028 12.8993 17.8056 12.4244 18.1002 12.1333L19.7864 10.4666Z" fill="currentColor"/>
                </svg>
                Заново
              </button>
            )}
          </div>
        )}
      </div>

      {/* Журнал анализа */}
      {journal.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {/* Заголовок журнала со статистикой */}
          <button
            onClick={() => setJournalOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", background: "none", border: "none", padding: "0 0 4px 0",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280" }}>
              {journalOpen ? "▾" : "▸"} Журнал обработки
            </span>
            <span style={{ fontSize: 9, color: "#9ca3af" }}>
              {journal.filter(e => e.status === "done" && e.lyricsPreview).length} с текстом ·{" "}
              {journal.filter(e => e.status === "done" && !e.lyricsPreview).length} без текста ·{" "}
              {journal.filter(e => e.status === "error").length} ошибок
            </span>
          </button>

          {journalOpen && (
            <>
              {journal.filter(e => e.status === "error").length > 0 && (
                <div style={{ fontSize: 9, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "3px 6px", marginBottom: 4 }}>
                  Ошибки будут повторно обработаны при следующем запуске анализа
                </div>
              )}
              <div style={{
                maxHeight: 220,
                overflowY: "auto",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontSize: 10,
              }}>
                {journal.map((e, i) => {
                  const isLast = i === journal.length - 1;
                  const isExpanded = expandedEntry === e.name;
                  const canExpand = e.status === "error" || (e.status === "done" && (e.lyrics || e.lyricsPreview));

                  const dotColor =
                    e.status === "processing" ? null :
                    e.status === "error" ? "#fca5a5" :
                    e.lyricsPreview ? "#6ee7b7" : "#d1d5db";

                  return (
                    <div key={e.name} style={{
                      borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                      background: e.status === "processing" ? "#fffbeb" :
                                  isExpanded ? "#f0fdf4" : "transparent",
                    }}>
                      {/* Строка с названием */}
                      <div
                        onClick={() => {
                          if (!canExpand) return;
                          const next = isExpanded ? null : e.name;
                          setExpandedEntry(next);
                          // Если lyrics нет в журнале — подгружаем из БД
                          if (next && !e.lyrics && !fetchedLyrics[e.name]) {
                            fetch(`${rpiBaseUrl}/api/songs/lyrics?name=${encodeURIComponent(e.name)}`)
                              .then(r => r.json())
                              .then(d => {
                                if (d.status === "ok") {
                                  setFetchedLyrics(prev => ({ ...prev, [e.name]: d.lyrics || "(пусто)" }));
                                }
                              }).catch(() => {});
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "5px 8px",
                          cursor: canExpand ? "pointer" : "default",
                        }}
                      >
                        {e.status === "processing" ? (
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                            border: "1.5px solid #d97706", borderTopColor: "transparent",
                            animation: "spin 0.8s linear infinite", display: "inline-block",
                          }} />
                        ) : (
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor!, flexShrink: 0, display: "inline-block" }} />
                        )}
                        <span style={{ fontWeight: 500, color: "#1f2937", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.name}
                        </span>
                        <span style={{ fontSize: 9, flexShrink: 0, color:
                          e.status === "processing" ? "#d97706" :
                          e.status === "error" ? "#ef4444" :
                          e.lyricsPreview ? "#059669" : "#9ca3af"
                        }}>
                          {e.status === "processing" && "обработка…"}
                          {e.status === "done" && e.lyricsPreview && (isExpanded ? "▴ скрыть" : "текст ▾")}
                          {e.status === "done" && !e.lyricsPreview && (e.hasPdfText ? "нет слов в PDF" : "нет PDF")}
                          {e.status === "error" && (isExpanded ? "▴ скрыть" : "ошибка ▾")}
                        </span>
                      </div>

                      {/* Раскрытый блок с полным текстом */}
                      {isExpanded && e.status === "done" && (() => {
                        const fullText = e.lyrics || fetchedLyrics[e.name];
                        const loading = !e.lyrics && !fetchedLyrics[e.name] && e.lyricsPreview;
                        return (
                          <div style={{
                            padding: "6px 8px 8px 20px",
                            background: "#f0fdf4",
                            borderTop: "1px solid #d1fae5",
                            fontSize: 10,
                            color: fullText && fullText !== "(пусто)" ? "#065f46" : "#9ca3af",
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.6,
                            maxHeight: 200,
                            overflowY: "auto",
                          }}>
                            {loading ? "Загружаю…" : fullText || "Текст не извлечён"}
                          </div>
                        );
                      })()}
                      {isExpanded && e.status === "error" && (
                        <div style={{ padding: "4px 8px 6px 20px", background: "#fff1f2", borderTop: "1px solid #fecdd3", fontSize: 10, color: "#9f1239" }}>
                          {e.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const LS_KEY = "ai-recommend-state";

function loadSavedState() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}

function saveState(context: string, duration: number, items: AiSong[], rationale: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ context, duration, items, rationale }));
  } catch {}
}

function TabRecommend({
  rpiBaseUrl,
  isLocal,
  library,
  onAccept,
}: {
  rpiBaseUrl?: string;
  isLocal?: boolean;
  library: ServerSong[];
  onAccept: (songs: AiSong[]) => void;
}) {
  const saved = loadSavedState();
  const [context, setContext] = useState<string>(saved?.context ?? "");
  const [duration, setDuration] = useState<number>(saved?.duration ?? 60);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AiSong[]>(() => {
    if (!saved?.items?.length) return [];
    // Восстанавливаем matched из библиотеки (объекты не сериализуются полностью)
    return (saved.items as AiSong[]).map((s) => ({
      ...s,
      matched: matchSong(s.name, library),
    }));
  });
  const [rationale, setRationale] = useState<string>(saved?.rationale ?? "");
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  // Сохраняем состояние при каждом изменении
  useEffect(() => {
    saveState(context, duration, items, rationale);
  }, [context, duration, items, rationale]);

  const estimatedCount = Math.max(1, Math.round(duration / 3));

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setItems([]);
    setRationale("");
    setProgressText("");
    try {
      const res = await fetch(`/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          durationMinutes: duration,
          songs: library.slice(0, 80).map((s) => ({
            name: s.name,
            category: s.category,
            aiSummary: (s as any).aiSummary ?? null,
          })),
        }),
      });

      if (!res.body) throw new Error("Нет ответа от сервера");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const event = JSON.parse(part.slice(6));
          if (event.type === "progress") {
            setProgressText(event.text);
          } else if (event.type === "result") {
            if (event.rationale) setRationale(event.rationale);
            setItems(
              (event.recommendations as any[]).map((r) => ({
                id: genInstanceId(),
                name: r.name,
                author: r.author ?? "",
                section: "",
                reason: r.reason ?? "",
                matched: matchSong(r.name, library),
              }))
            );
            setProgressText("");
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setProgressText("");
    }
  };

  const handleReplaceSelect = (libraryItem: ServerSong) => {
    setItems((prev) =>
      prev.map((s) =>
        s.id === replaceTargetId
          ? { ...s, name: libraryItem.name, author: libraryItem.author ?? "", matched: libraryItem }
          : s
      )
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <LibraryAnalyzeButton rpiBaseUrl={rpiBaseUrl ?? ""} library={library} />

      <Textarea
        label="Опишите контекст выступления"
        placeholder=""
        value={context}
        onValueChange={setContext}
        minRows={2}
        maxRows={4}
        classNames={{ label: "input-header text-xs text-default-500", input: "main-font" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p className="input-header" style={{ fontSize: 12, color: "#9B8170" }}>
          Длительность выступления
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setDuration((d) => Math.max(5, d - 5))}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "1px solid #E6D3C2", background: "#FFFAF5",
              color: "#7D5E42", fontSize: 20, fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >−</button>
          <div className="main-font" style={{
            flex: 1, textAlign: "center", fontSize: 15, color: "#1C1009",
          }}>
            {duration} мин &nbsp;·&nbsp; ~{estimatedCount} произведений
          </div>
          <button
            onClick={() => setDuration((d) => Math.min(180, d + 5))}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "1px solid #E6D3C2", background: "#FFFAF5",
              color: "#7D5E42", fontSize: 20, fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >+</button>
        </div>
      </div>

      <Button
        onPress={handleGenerate}
        isLoading={loading}
        className="w-full main-font text-white rounded-xl"
        style={{ background: "linear-gradient(135deg, #1a1f5e, #2d3a8c)", fontSize: 15 }}
        isDisabled={library.length === 0 || !context.trim()}
      >
        {loading ? "Подбираю…" : "Подобрать репертуар"}
      </Button>

      {library.length === 0 && (
        <p className="text-center text-amber-500 text-xs">Библиотека не загружена</p>
      )}
      {loading && progressText && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
            border: "2px solid #7D5E42", borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite", flexShrink: 0,
          }} />
          <span className="main-font" style={{ fontSize: 12, color: "#7D5E42" }}>{progressText}</span>
        </div>
      )}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {rationale && (
        <div style={{
          background: "#3B1A08", borderRadius: 14, padding: "12px 16px",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <p className="main-font" style={{
            fontSize: 10, fontWeight: 700,
            color: "#C49A72", letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            Логика программы
          </p>
          <p className="main-font" style={{
            fontSize: 13, color: "#F5E6D3", lineHeight: 1.55,
          }}>
            {rationale}
          </p>
        </div>
      )}

      {items.length > 0 && (
        <>
          <SortableResults items={items} setItems={setItems} onReplace={setReplaceTargetId} />

          {/* Кнопка «Заново» */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="main-font"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "10px 0",
              borderRadius: 14, border: "1px solid #DEC9B0",
              background: "#FFFAF5", color: "#7D5E42",
              fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M2.93077 11.2003C3.00244 6.23968 7.07619 2.25 12.0789 2.25C15.3873 2.25 18.287 3.99427 19.8934 6.60721C20.1103 6.96007 20.0001 7.42199 19.6473 7.63892C19.2944 7.85585 18.8325 7.74565 18.6156 7.39279C17.2727 5.20845 14.8484 3.75 12.0789 3.75C7.8945 3.75 4.50372 7.0777 4.431 11.1982L4.83138 10.8009C5.12542 10.5092 5.60029 10.511 5.89203 10.8051C6.18377 11.0991 6.18191 11.574 5.88787 11.8657L4.20805 13.5324C3.91565 13.8225 3.44398 13.8225 3.15157 13.5324L1.47176 11.8657C1.17772 11.574 1.17585 11.0991 1.46759 10.8051C1.75933 10.5111 2.2342 10.5092 2.52824 10.8009L2.93077 11.2003ZM19.7864 10.4666C20.0786 10.1778 20.5487 10.1778 20.8409 10.4666L22.5271 12.1333C22.8217 12.4244 22.8245 12.8993 22.5333 13.1939C22.2421 13.4885 21.7673 13.4913 21.4727 13.2001L21.0628 12.7949C20.9934 17.7604 16.9017 21.75 11.8825 21.75C8.56379 21.75 5.65381 20.007 4.0412 17.3939C3.82366 17.0414 3.93307 16.5793 4.28557 16.3618C4.63806 16.1442 5.10016 16.2536 5.31769 16.6061C6.6656 18.7903 9.09999 20.25 11.8825 20.25C16.0887 20.25 19.4922 16.9171 19.5625 12.7969L19.1546 13.2001C18.86 13.4913 18.3852 13.4885 18.094 13.1939C17.8028 12.8993 17.8056 12.4244 18.1002 12.1333L19.7864 10.4666Z" fill="#7D5E42"/>
            </svg>
            Подобрать заново
          </button>

          <Button
            onPress={() => onAccept(items)}
            className="w-full main-font text-white rounded-xl"
            style={{ background: "linear-gradient(to right, #bd9673, #7d5e42)", fontSize: 15 }}
            variant="flat"
          >
            Принять программу
          </Button>
        </>
      )}

      <ReplaceModal
        isOpen={!!replaceTargetId}
        onClose={() => setReplaceTargetId(null)}
        library={library}
        onSelect={handleReplaceSelect}
      />
    </div>
  );
}

// ─── Контент для боковой панели ──────────────────────────────────────────────

export function AiRecommendContent({ onClose }: { onClose?: () => void }) {
  const ctx = useStackContext() as any;
  const setStackSongs: (songs: any[]) => void = ctx.setStackSongs;
  const { allSongs } = useAllSongsLibraryContextProvider();
  const { rpiBaseUrl, isLocal } = useLocalServer();

  const handleAccept = useCallback(
    (aiSongs: AiSong[]) => {
      setStackSongs(
        aiSongs.filter((s) => s.matched).map((s) => ({
          ...s.matched!,
          instanceId: genInstanceId(),
          isReserve: false,
        }))
      );
      onClose?.();
    },
    [setStackSongs, onClose]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <TabRecommend rpiBaseUrl={rpiBaseUrl} isLocal={isLocal} library={allSongs} onAccept={handleAccept} />
      </div>
    </div>
  );
}

// ─── Запасной компонент (вне sidebar) ────────────────────────────────────────

export function AiRecommend() {
  const ctx = useStackContext() as any;
  const setStackSongs: (songs: any[]) => void = ctx.setStackSongs;
  const { allSongs } = useAllSongsLibraryContextProvider();
  const { isLocal, rpiBaseUrl } = useLocalServer();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInternet, setHasInternet] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const on = () => setHasInternet(true);
    const off = () => setHasInternet(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const handleAccept = useCallback(
    (aiSongs: AiSong[]) => {
      setStackSongs(
        aiSongs.filter((s) => s.matched).map((s) => ({ ...s.matched!, instanceId: genInstanceId(), isReserve: false }))
      );
      setIsOpen(false);
    },
    [setStackSongs]
  );

  if (!hasInternet) return null;

  return (
    <div className="my-4">
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderRadius: 14,
          border: "1px solid #3b4fa0",
          background: "linear-gradient(135deg, #1a1f5e 0%, #2d3a8c 50%, #1e2a6e 100%)",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* звёздочки */}
        <span style={{ position: "absolute", inset: 0, pointerEvents: "none", fontSize: 10, color: "rgba(255,255,255,0.35)", userSelect: "none" }}
          aria-hidden>
          <span style={{ position: "absolute", top: 5,  left: 12 }}>✦</span>
          <span style={{ position: "absolute", top: 14, left: 55 }}>·</span>
          <span style={{ position: "absolute", top: 4,  left: 90 }}>✦</span>
          <span style={{ position: "absolute", top: 16, left: 130 }}>·</span>
          <span style={{ position: "absolute", top: 6,  right: 60 }}>✦</span>
          <span style={{ position: "absolute", top: 15, right: 30 }}>·</span>
          <span style={{ position: "absolute", bottom: 5, left: 40 }}>·</span>
          <span style={{ position: "absolute", bottom: 6, left: 75 }}>✦</span>
          <span style={{ position: "absolute", bottom: 4, right: 80 }}>·</span>
        </span>
        <span className="main-font" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#c8d4ff", position: "relative" }}>
          <span style={{ fontSize: 16 }}>✦</span> ИИ-помощник
        </span>
        <span style={{ color: "#8899cc", fontSize: 11, position: "relative" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="mt-2 rounded-xl border border-[#E6D3C2] bg-[#FFFAF5]/80 p-4">
          <TabRecommend rpiBaseUrl={rpiBaseUrl} isLocal={isLocal} library={allSongs} onAccept={handleAccept} />
        </div>
      )}
    </div>
  );
}
