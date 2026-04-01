"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { socket } from "@/lib/socket";

type ChatMessage = {
  _id: string;
  sender: string;
  receiver: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
};

const ALLOWED_CHAT_USERS = new Set(["regent", "bishop"]);

const CHAT_TITLES: Record<string, string> = {
  regent: "Регент",
  bishop: "Bishop",
};

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
  const isAllowedUser = ALLOWED_CHAT_USERS.has(username);
  const otherUser = username === "regent" ? "bishop" : "regent";

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isAllowedUser) {
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
      setMessages(payload.messages || []);
      setUnreadCount(payload.unreadCount || 0);
      setOnlineUsers(payload.onlineUsers || []);
    };

    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);

      if (isOpenRef.current && message.receiver === username) {
        setUnreadCount(0);
        socket.emit("chat:mark-read");
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
            : message
        )
      );
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

    return () => {
      socket.off("connect", registerChat);
      socket.off("chat:bootstrap", handleBootstrap);
      socket.off("chat:new-message", handleNewMessage);
      socket.off("chat:unread-count", handleUnreadCount);
      socket.off("chat:presence", handlePresence);
      socket.off("chat:messages-read", handleMessagesRead);
    };
  }, [isAllowedUser, username]);

  useEffect(() => {
    if (isAllowedUser && isOpen) {
      setUnreadCount(0);
      socket.emit("chat:mark-read");
    }
  }, [isAllowedUser, isOpen]);

  if (!isAllowedUser) {
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
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOtherUserOnline ? "bg-green-500" : "bg-slate-300"
              }`}
            />
          </div>

          <div className="flex h-[320px] flex-col">
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
