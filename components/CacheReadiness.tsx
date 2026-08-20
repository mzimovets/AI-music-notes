"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ModalContent } from "@heroui/modal";
import { socket } from "@/lib/socket";
import { recacheStack } from "@/lib/recache";
import {
  checkReadiness,
  readinessPercent,
  type Readiness,
  type ReadinessItem,
} from "@/lib/cache-readiness";

/**
 * Готовность к работе без связи: маленькая полоса на главной и подробности по
 * нажатию.
 *
 * Появилась после того, как ноты несколько раз не открывались на месте, хотя
 * перед выездом «всё выглядело хорошо». Проверка смотрит в настоящее хранилище
 * кеша и сверяет с сервером, поэтому отвечает не «вроде да», а перечнем: что
 * скачано, чего нет, что успели поправить после скачивания.
 *
 * Пересчитывается сама — по событиям правок и по возвращению в приложение,
 * без перезагрузки страницы.
 */

const RECHECK_MS = 30_000;

/** Круглая полоса в углу — те же пропорции, что у плашки кеширования */
const RING_RADIUS = 18;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function stateLabel(item: ReadinessItem): { text: string; color: string; bg: string } {
  if (item.state === "ok") return { text: "Скачано", color: "#166534", bg: "rgba(74,222,128,0.18)" };
  if (item.state === "stale") return { text: "Изменено после скачивания", color: "#92400e", bg: "rgba(251,191,36,0.22)" };
  return {
    text: item.fileMissing ? "Нет листов" : "Не скачано",
    color: "#991b1b",
    bg: "rgba(248,113,113,0.18)",
  };
}

export function CacheReadiness() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const checking = useRef(false);

  const refresh = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      setReadiness(await checkReadiness());
    } finally {
      checking.current = false;
    }
  }, []);

  // Пересчёт по всякому поводу, который может изменить картину. Перезагрузка
  // страницы для этого не нужна — в том и смысл
  useEffect(() => {
    refresh();

    const timer = setInterval(refresh, RECHECK_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    window.addEventListener("sw-recache-done", refresh);
    window.addEventListener("db-sync-complete", refresh);
    socket.on("db-synced", refresh);
    socket.on("stack-updated", refresh);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      window.removeEventListener("sw-recache-done", refresh);
      window.removeEventListener("db-sync-complete", refresh);
      socket.off("db-synced", refresh);
      socket.off("stack-updated", refresh);
    };
  }, [refresh]);

  const missing = readiness
    ? [...readiness.stacks, ...readiness.songs].filter((i) => i.state !== "ok")
    : [];

  /**
   * Докачивает недостающее. Программы, которые поправили после скачивания,
   * обычным проходом не обновятся — он смотрит только на новые записи, —
   * поэтому их перекачиваем поимённо.
   */
  const fillGaps = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const stale = missing.filter((i) => i.kind === "stack" && i.state === "stale");
      for (const item of stale) await recacheStack(item.id);
      window.dispatchEvent(new Event("sw-sync-needed"));
    } finally {
      setBusy(false);
      setTimeout(refresh, 1500);
    }
  }, [busy, missing, refresh]);

  // Само по себе, без нажатий: увидели нехватку и есть связь — докачиваем.
  // Ровно тот случай, когда кеширование прервали, закрыв приложение
  const autoFilled = useRef(0);
  useEffect(() => {
    if (!readiness?.fresh || missing.length === 0 || busy) return;
    // Не чаще раза в пару минут, чтобы не ходить по кругу, если что-то
    // упорно не скачивается
    if (Date.now() - autoFilled.current < 120_000) return;
    autoFilled.current = Date.now();
    fillGaps();
  }, [readiness, missing.length, busy, fillGaps]);

  if (!readiness) return null;

  const percent = readinessPercent(readiness);
  const allReady = missing.length === 0 && readiness.engineOk && readiness.homeOk;
  const barColor = allReady
    ? "linear-gradient(90deg,#4ade80,#16a34a)"
    : percent > 80
      ? "linear-gradient(90deg,#fbbf24,#d97706)"
      : "linear-gradient(90deg,#f87171,#dc2626)";
  const ringColor = allReady ? "#16a34a" : percent > 80 ? "#d97706" : "#dc2626";

  return (
    <>
      <button
        onClick={() => { setOpen(true); refresh(); }}
        aria-label="Готовность к работе без связи"
        title={allReady ? "Всё скачано" : `Скачано ${percent}%`}
        style={{
          position: "fixed", left: 12, bottom: 12, zIndex: 40,
          width: 44, height: 44, padding: 0, borderRadius: "50%", border: "none",
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          cursor: "pointer", display: "grid", placeItems: "center",
        }}
      >
        <svg width={44} height={44} viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="22" cy="22" r={RING_RADIUS} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3.5" />
          <circle
            cx="22" cy="22" r={RING_RADIUS} fill="none"
            stroke={ringColor} strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - percent / 100)}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
          />
        </svg>
        <span
          className="input-header"
          style={{
            position: "absolute", fontSize: allReady ? 13 : 10, fontWeight: 700,
            color: allReady ? "#16a34a" : "#7D5E42", lineHeight: 1,
          }}
        >
          {allReady ? "✓" : percent}
        </span>
      </button>

      <Modal
        isOpen={open}
        onOpenChange={(v) => setOpen(v)}
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{ base: "max-w-[520px] w-[calc(100vw-16px)]" }}
      >
        <ModalContent>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, maxHeight: "78vh" }}>
            <div>
              <div className="input-header" style={{ fontSize: 17, fontWeight: 700, color: "#2d2015" }}>
                Готовность без связи
              </div>
              <div className="input-header" style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 3, lineHeight: 1.4 }}>
                {readiness.fresh
                  ? "Список сверен с сервером только что"
                  : "Связи с сервером нет — сверяем с последним известным списком, на сервере могло появиться что-то ещё"}
              </div>
            </div>

            <div style={{ height: 8, borderRadius: 4, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${percent}%`, background: barColor, transition: "width 0.5s ease" }} />
            </div>

            <div className="input-header" style={{ fontSize: 13, color: "#2d2015" }}>
              {allReady
                ? "Всё на месте. Ноты откроются без интернета."
                : `Не хватает: ${missing.length} из ${readiness.total}`}
            </div>

            {(!readiness.engineOk || !readiness.homeOk) && (
              <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(248,113,113,0.12)" }}>
                <span className="input-header" style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.4 }}>
                  {!readiness.engineOk && "Не скачан движок просмотра нот — без него не откроется ни один лист. "}
                  {!readiness.homeOk && "Не скачана главная страница."}
                </span>
              </div>
            )}

            {missing.length > 0 && (
              <button
                onClick={fillGaps}
                disabled={busy || !readiness.fresh}
                className="input-header"
                style={{
                  padding: "10px 14px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700,
                  color: "#fff", cursor: busy || !readiness.fresh ? "default" : "pointer",
                  opacity: busy || !readiness.fresh ? 0.55 : 1,
                  background: "linear-gradient(to right, #BD9673, #7D5E42)",
                }}
              >
                {busy ? "Догружаю…" : readiness.fresh ? "Догрузить недостающее" : "Нужна связь с сервером"}
              </button>
            )}

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
              <Section title="Программы" items={readiness.stacks} />
              <Section title="Ноты" items={readiness.songs} />
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}

function Section({ title, items }: { title: string; items: ReadinessItem[] }) {
  // Сначала беды — ради них сюда и заходят
  const sorted = [...items].sort((a, b) => (a.state === "ok" ? 1 : 0) - (b.state === "ok" ? 1 : 0));
  const bad = items.filter((i) => i.state !== "ok").length;

  if (items.length === 0) return null;

  return (
    <div>
      <div className="input-header" style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.4)", marginBottom: 5 }}>
        {title} · {items.length - bad} из {items.length}
      </div>
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
        {sorted.map((item, i) => {
          const label = stateLabel(item);
          return (
            <div
              key={item.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
                padding: "6px 10px",
                borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,0.04)",
                background: i % 2 ? "rgba(0,0,0,0.015)" : "transparent",
              }}
            >
              <span className="input-header" style={{ fontSize: 12, color: "#2d2015", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.title}
              </span>
              <span className="input-header" style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, color: label.color, background: label.bg, whiteSpace: "nowrap" }}>
                {label.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
