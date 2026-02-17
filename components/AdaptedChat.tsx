"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
} from "@chatscope/chat-ui-kit-react";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";

interface ChatProps {
  userId: string;
}

export default function AdaptedChat({ userId }: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    s.on("connect", () => console.log("Connected to Socket.IO"));
    s.on("chat message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => s.disconnect();
  }, []);

  function sendMessage(text: string) {
    if (!socket || !text.trim()) return;

    const msg = {
      message: text,
      sender: userId,
      timestamp: new Date().toISOString(),
    };

    socket.emit("chat message", msg);
    setMessages((prev) => [...prev, msg]);
  }

  return (
    <MainContainer style={{ height: 400, width: 360 }}>
      <ChatContainer
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div style={{ flex: 1, overflowY: "auto" }}>
          <MessageList>
            {messages.map((msg, idx) => (
              <Message
                key={idx}
                model={{
                  message: msg.message,
                  sender: msg.sender,
                  sentTime: new Date(msg.timestamp).toLocaleTimeString(),
                  direction: msg.sender === userId ? "outgoing" : "incoming",
                  type: "text",
                }}
              />
            ))}
          </MessageList>
        </div>
        <MessageInput placeholder="Type a message..." onSend={sendMessage} />
      </ChatContainer>
    </MainContainer>
  );
}
