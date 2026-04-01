"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { socket } from "@/lib/socket";
import {
  CHAT_VISIBILITY_CHANGE_EVENT,
  getStoredChatVisibility,
  syncChatVisibilityFromDatabase,
  isChatEligibleUser,
} from "@/lib/chat-settings";

type ChatMessage = {
  _id: string;
  sender: string;
  receiver: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
};

const CHAT_RETENTION_MS = 6 * 60 * 60 * 1000;
const CHAT_EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

const CHAT_TITLES: Record<string, string> = {
  regent: "Регент",
  bishop: "Bishop",
};

function getNotificationSupport() {
  if (typeof window === "undefined") {
    return false;
  }

  return "Notification" in window && "serviceWorker" in navigator;
}

function isExpiredChatMessage(createdAt: string) {
  const createdAtMs = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtMs)) {
    return true;
  }

  return Date.now() - createdAtMs >= CHAT_RETENTION_MS;
}

function filterFreshMessages(messages: ChatMessage[]) {
  return messages.filter((message) => !isExpiredChatMessage(message.createdAt));
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DirectChatWidget() {
  const { data: session } = useSession();
  const username = session?.user?.name?.toLowerCase() || "";
  const isAllowedUser = isChatEligibleUser(username);
  const otherUser = username === "regent" ? "bishop" : "regent";

  const [isOpen, setIsOpen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(isOpen);
  const notificationSupportRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isOpen]);

  useEffect(() => {
    const supported = getNotificationSupport();
    notificationSupportRef.current = supported;

    if (!supported) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!isAllowedUser) {
      setIsChatVisible(true);
      return;
    }

    setIsChatVisible(getStoredChatVisibility(username));

    let isCancelled = false;

    syncChatVisibilityFromDatabase(username)
      .then((nextValue) => {
        if (!isCancelled) {
          setIsChatVisible(nextValue);
        }
      })
      .catch(() => {});

    const handleVisibilityChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        username?: string;
        isVisible?: boolean;
      }>;

      if (customEvent.detail?.username !== username) {
        return;
      }

      setIsChatVisible(customEvent.detail.isVisible !== false);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === null) {
        return;
      }

      setIsChatVisible(getStoredChatVisibility(username));
    };

    window.addEventListener(CHAT_VISIBILITY_CHANGE_EVENT, handleVisibilityChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      isCancelled = true;
      window.removeEventListener(
        CHAT_VISIBILITY_CHANGE_EVENT,
        handleVisibilityChange,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isAllowedUser, username]);

  useEffect(() => {
    if (!isAllowedUser) {
      setIsOpen(false);
      setDraft("");
      setMessages([]);
      setUnreadCount(0);
      setOnlineUsers([]);
      return;
    }

    if (!isChatVisible) {
      setIsOpen(false);
      setDraft("");
      setMessages([]);
      setUnreadCount(0);
      setOnlineUsers([]);
      return;
    }

    const registerChat = () => {
      socket.emit("chat:register", { username });
    };

    const handleBootstrap = (payload: {
      messages?: ChatMessage[];
      unreadCount?: number;
      onlineUsers?: string[];
    }) => {
      setMessages(filterFreshMessages(payload.messages || []));
      setUnreadCount(payload.unreadCount || 0);
      setOnlineUsers(payload.onlineUsers || []);
    };

    const handleNewMessage = (message: ChatMessage) => {
      if (isExpiredChatMessage(message.createdAt)) {
        return;
      }

      setMessages((prev) => [...prev, message]);

      if (isOpenRef.current && message.receiver === username) {
        setUnreadCount(0);
        socket.emit("chat:mark-read");
      }

      const canNotifyCurrentUser =
        message.receiver === username &&
        notificationSupportRef.current &&
        Notification.permission === "granted";
      const shouldShowNotification =
        canNotifyCurrentUser &&
        (!isOpenRef.current || document.hidden || !document.hasFocus());

      if (shouldShowNotification) {
        navigator.serviceWorker.ready
          .then((registration) =>
            registration.showNotification(
              `Новое сообщение от ${CHAT_TITLES[message.sender]}`,
              {
                body: message.text,
                tag: `chat-message-${message._id}`,
                renotify: true,
                data: { url: "/" },
              },
            ),
          )
          .catch(() => {});
      }
    };

    const handleUnreadCount = (count: number) => {
      setUnreadCount(count || 0);
    };

    const handlePresence = (payload: { onlineUsers?: string[] }) => {
      setOnlineUsers(payload.onlineUsers || []);
    };

    const handleMessagesRead = ({
      reader,
      readAt,
    }: {
      reader: string;
      readAt: string;
    }) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.receiver === reader && !message.isRead
            ? { ...message, isRead: true, readAt }
            : message,
        ),
      );
    };

    const handleCleared = () => {
      setMessages([]);
      setUnreadCount(0);
    };

    if (socket.connected) {
      registerChat();
    }

    socket.on("connect", registerChat);
    socket.on("chat:bootstrap", handleBootstrap);
    socket.on("chat:new-message", handleNewMessage);
    socket.on("chat:unread-count", handleUnreadCount);
    socket.on("chat:presence", handlePresence);
    socket.on("chat:messages-read", handleMessagesRead);
    socket.on("chat:cleared", handleCleared);

    return () => {
      socket.off("connect", registerChat);
      socket.off("chat:bootstrap", handleBootstrap);
      socket.off("chat:new-message", handleNewMessage);
      socket.off("chat:unread-count", handleUnreadCount);
      socket.off("chat:presence", handlePresence);
      socket.off("chat:messages-read", handleMessagesRead);
      socket.off("chat:cleared", handleCleared);
    };
  }, [isAllowedUser, isChatVisible, username]);

  useEffect(() => {
    if (isAllowedUser && isOpen) {
      setUnreadCount(0);
      socket.emit("chat:mark-read");
    }
  }, [isAllowedUser, isOpen]);

  useEffect(() => {
    if (!isAllowedUser) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessages((prev) => filterFreshMessages(prev));
    }, CHAT_EXPIRY_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAllowedUser]);

  if (!isAllowedUser || !isChatVisible) {
    return null;
  }

  const isOtherUserOnline = onlineUsers.includes(otherUser);

  const sendMessage = () => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    socket.emit("chat:send-message", { text: trimmedDraft });
    setDraft("");
  };

  const clearChat = () => {
    setMessages([]);
    setUnreadCount(0);
    socket.emit("chat:clear");
  };

  const enableNotifications = async () => {
    if (!notificationSupportRef.current) {
      setNotificationPermission("unsupported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission(Notification.permission);
    }
  };

  return (
    <div className="fixed left-4 bottom-4 z-[80] flex flex-col items-start gap-3">
      {isOpen && (
        <div className="w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#d9c1a9] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between border-b border-[#ede2d7] bg-[#f8f2ec] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#5d4630]">
                Чат с {CHAT_TITLES[otherUser]}
              </p>
              <p className="text-xs text-[#8b735d]">
                {isOtherUserOnline ? "В сети" : "Не в сети"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOtherUserOnline ? "bg-green-500" : "bg-slate-300"
                }`}
              />
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg border border-[#d8c2ad] bg-white px-2.5 py-1 text-xs font-medium text-[#6b4e35] transition hover:bg-[#f5ede6]"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[#d8c2ad] bg-white px-2.5 py-1 text-xs font-medium text-[#6b4e35] transition hover:bg-[#f5ede6]"
              >
                Закрыть
              </button>
            </div>
          </div>

          <div className="flex h-[320px] flex-col">
            {notificationPermission !== "granted" &&
              notificationPermission !== "unsupported" && (
                <div className="border-b border-[#ede2d7] bg-[#fff8ef] px-4 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-[#7b6248]">
                      Включи уведомления, чтобы не пропускать новые сообщения.
                    </p>
                    <button
                      type="button"
                      onClick={enableNotifications}
                      className="shrink-0 rounded-lg bg-[#7d5e42] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#694d35]"
                    >
                      Включить
                    </button>
                  </div>
                </div>
              )}

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#fcfaf8] px-4 py-4">
              {messages.length === 0 ? (
                <p className="pt-10 text-center text-sm text-[#9b8876]">
                  Сообщений пока нет
                </p>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender === username;

                  return (
                    <div
                      key={message._id}
                      className={`flex ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                          isOwnMessage
                            ? "bg-[#7d5e42] text-white"
                            : "bg-white text-[#473424] border border-[#eadfd4]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-5">
                          {message.text}
                        </p>
                        <div
                          className={`mt-1 text-[11px] ${
                            isOwnMessage ? "text-white/70" : "text-[#9b8876]"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-[#ede2d7] bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Введите сообщение"
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-[#d8c2ad] px-3 py-2 text-sm text-[#473424] outline-none transition focus:border-[#7d5e42]"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="rounded-xl bg-[#7d5e42] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#694d35]"
                >
                  Отпр.
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-14 min-w-[120px] items-center justify-center rounded-full bg-gradient-to-r from-[#bd9673] to-[#7d5e42] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(125,94,66,0.35)] transition hover:translate-y-[-1px]"
      >
        Чат
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#d92d20] px-1.5 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
