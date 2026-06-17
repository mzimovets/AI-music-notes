"use client";
import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription(rpiBaseUrl: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setIsSupported(supported);
    if (supported) checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {}
  }

  async function subscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const base = rpiBaseUrl || "";
      const keyRes = await fetch(`${base}/api/push/vapid-public-key`);
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${base}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      setIsSubscribed(true);
    } catch (e) {
      console.error("[push] subscribe error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const base = rpiBaseUrl || "";
        await fetch(`${base}/api/push/subscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error("[push] unsubscribe error:", e);
    } finally {
      setLoading(false);
    }
  }

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe };
}
