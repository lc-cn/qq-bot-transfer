import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resolve the public base URL (client: window.location.origin, server: env). */
export function publicBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  const fromEnv = process.env.PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

/** Build all endpoint URLs for a bot. */
export function botUrls(appId: string) {
  const base = publicBaseUrl();
  const host = new URL(base).host;
  const wsProto = base.startsWith("https") ? "wss" : "ws";
  return {
    webhook: `${base}/webhook/${appId}`,
    gateway: `${base}/gateway/${appId}`,
    auth: `${base}/app/getAppAccessToken`,
    websocket: `${wsProto}://${host}/websocket/${appId}`,
  };
}
