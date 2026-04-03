const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

const DEFAULT_BACKEND_URL = "http://localhost:4000";

function toUrl(value: string, fallbackBase: string) {
  try {
    return new URL(value);
  } catch {
    return new URL(value, fallbackBase);
  }
}

function replaceLocalHostname(url: URL) {
  if (typeof window === "undefined") return;

  const currentHostname = window.location.hostname;
  if (!currentHostname || LOCAL_HOSTNAMES.has(currentHostname)) return;

  if (LOCAL_HOSTNAMES.has(url.hostname)) {
    url.hostname = currentHostname;
  }
}

export function getBackendBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_BASIC_BACK_URL || DEFAULT_BACKEND_URL;
  const fallbackBase =
    typeof window === "undefined" ? DEFAULT_BACKEND_URL : window.location.origin;
  const url = toUrl(configuredUrl, fallbackBase);

  replaceLocalHostname(url);

  return url.origin;
}

export function getUploadPath(filename: string) {
  return `/uploads/${encodeURIComponent(filename)}`;
}

export function getPublicUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window === "undefined") {
    return normalizedPath;
  }

  return new URL(normalizedPath, window.location.origin).toString();
}

export function getUploadUrl(filename: string) {
  return getPublicUrl(getUploadPath(filename));
}

export function getClickerWebSocketUrl(port = 3001) {
  if (typeof window === "undefined") {
    return `ws://localhost:${port}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:${port}`;
}
