"use client";

import { useState } from "react";
import AdaptedChat from "./AdaptedChat";

export default function AdaptedChatButton() {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      {showChat && (
        <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 1000 }}>
          <AdaptedChat userId="userA" />
        </div>
      )}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: "50%",
          backgroundColor: "#3b82f6",
          color: "white",
          fontSize: 24,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
        }}
        onClick={() => setShowChat(!showChat)}
      >
        💬
      </div>
    </>
  );
}
