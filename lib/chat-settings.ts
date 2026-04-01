"use client";

import { getBackendBaseUrl } from "./client-url";

export const CHAT_ALLOWED_USERS = new Set(["regent", "bishop"]);
export const CHAT_VISIBILITY_CHANGE_EVENT = "chat-visibility-changed";

export function isChatEligibleUser(username: string) {
  return CHAT_ALLOWED_USERS.has(username.toLowerCase());
}

export function getChatVisibilityStorageKey(username: string) {
  return `chat-visibility:${username.toLowerCase()}`;
}

export function getStoredChatVisibility(username: string) {
  if (typeof window === "undefined" || !username) {
    return true;
  }

  const storedValue = window.localStorage.getItem(
    getChatVisibilityStorageKey(username),
  );

  if (storedValue === null) {
    return true;
  }

  return storedValue !== "off";
}

export function setStoredChatVisibility(username: string, isVisible: boolean) {
  if (typeof window === "undefined" || !username) {
    return;
  }

  window.localStorage.setItem(
    getChatVisibilityStorageKey(username),
    isVisible ? "on" : "off",
  );

  window.dispatchEvent(
    new CustomEvent(CHAT_VISIBILITY_CHANGE_EVENT, {
      detail: {
        username: username.toLowerCase(),
        isVisible,
      },
    }),
  );
}

export async function getChatVisibilityFromDatabase(username: string) {
  if (!username) {
    return true;
  }

  const response = await fetch(
    `${getBackendBaseUrl()}/user/${encodeURIComponent(username)}/settings`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load chat settings for ${username}`);
  }

  const data = await response.json();

  return data?.settings?.chatVisible !== false;
}

export async function syncChatVisibilityFromDatabase(username: string) {
  const chatVisible = await getChatVisibilityFromDatabase(username);
  setStoredChatVisibility(username, chatVisible);
  return chatVisible;
}

export async function saveChatVisibilityToDatabase(
  username: string,
  isVisible: boolean,
) {
  if (!username) {
    return isVisible;
  }

  const response = await fetch(
    `${getBackendBaseUrl()}/user/${encodeURIComponent(username)}/settings`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatVisible: isVisible,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to save chat settings for ${username}`);
  }

  const data = await response.json();
  const nextValue = data?.settings?.chatVisible !== false;

  setStoredChatVisibility(username, nextValue);

  return nextValue;
}
