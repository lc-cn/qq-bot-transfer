import { randomBytes } from "node:crypto";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function publicBaseUrl(): string {
  // 客户端：直接用浏览器当前 origin，与端口/代理无关地跟用户所见一致
  if (typeof window !== "undefined") return window.location.origin;
  // 服务端渲染：读 .env
  const fromEnv = process.env.PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

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

export function generateId(): string {
  return randomBytes(16).toString("hex");
}
