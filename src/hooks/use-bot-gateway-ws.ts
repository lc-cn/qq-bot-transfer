"use client";

import { useEffect, useRef, useState } from "react";

export type LiveGatewayEvent = {
  id: string;
  op: number | null;
  eventType: string | null;
  payload: unknown;
  receivedAt: string;
};

const OP_DISPATCH = 0;
const OP_HEARTBEAT = 1;
const OP_IDENTIFY = 2;
const OP_INVALID_SESSION = 9;
const OP_HELLO = 10;
const OP_HEARTBEAT_ACK = 11;

type WsMessage = {
  op: number;
  t?: string;
  d?: unknown;
  s?: number;
  access_token?: string;
};

function toEventRow(msg: WsMessage): LiveGatewayEvent | null {
  if (msg.op !== OP_DISPATCH || !msg.t || msg.t === "READY") return null;
  const { access_token: _at, ...rest } = msg as WsMessage & { id?: string };
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    op: msg.op,
    eventType: msg.t,
    payload: rest,
    receivedAt: new Date().toISOString(),
  };
}

export function useBotGatewayWs(
  appId: string,
  enabled: boolean,
  onEvent: (event: LiveGatewayEvent) => void,
) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setError(null);
      return;
    }

    let closed = false;
    let ws: WebSocket | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeq: number | null = null;

    const cleanup = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
      ws = null;
    };

    (async () => {
      setStatus("connecting");
      setError(null);

      const tokenRes = await fetch(
        `/api/bots/${encodeURIComponent(appId)}/access-token`,
        { method: "POST" },
      );
      if (!tokenRes.ok) {
        if (!closed) {
          setStatus("error");
          setError("getAppAccessToken 失败，请确认 Bot 已配置且已登录");
        }
        return;
      }
      if (closed) return;

      const { access_token } = (await tokenRes.json()) as {
        access_token?: string;
      };
      if (!access_token) {
        if (!closed) {
          setStatus("error");
          setError("未返回 access_token");
        }
        return;
      }

      const gatewayRes = await fetch(
        `/api/bots/${encodeURIComponent(appId)}/gateway`,
        { headers: { Authorization: `QQBot ${access_token}` } },
      );
      if (!gatewayRes.ok) {
        if (!closed) {
          setStatus("error");
          setError("GET /gateway 失败");
        }
        return;
      }
      if (closed) return;

      const { url: wsUrl } = (await gatewayRes.json()) as { url?: string };
      if (!wsUrl) {
        if (!closed) {
          setStatus("error");
          setError("gateway 未返回 WebSocket url");
        }
        return;
      }

      const token = `QQBot ${access_token}`;
      if (closed) return;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        /* 等待服务端 OpHello */
      };

      ws.onmessage = (ev) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(String(ev.data)) as WsMessage;
        } catch {
          return;
        }

        if (msg.op === OP_HELLO) {
          const interval =
            (msg.d as { heartbeat_interval?: number } | undefined)
              ?.heartbeat_interval ?? 30_000;
          ws!.send(
            JSON.stringify({
              op: OP_IDENTIFY,
              d: { token, shard: [0, 1] },
            }),
          );
          heartbeatTimer = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: OP_HEARTBEAT, d: lastSeq }));
            }
          }, interval);
          if (!closed) setStatus("connected");
          return;
        }

        if (msg.op === OP_HEARTBEAT_ACK) return;

        if (msg.op === OP_INVALID_SESSION) {
          const reason =
            (msg.d as { reason?: string } | undefined)?.reason ?? "鉴权失败";
          if (!closed) {
            setStatus("error");
            setError(reason);
          }
          ws?.close();
          return;
        }

        if (typeof msg.s === "number") lastSeq = msg.s;

        const row = toEventRow(msg);
        if (row) onEventRef.current(row);
      };

      ws.onerror = () => {
        if (!closed) {
          setStatus("error");
          setError("WebSocket 连接错误");
        }
      };

      ws.onclose = () => {
        if (!closed) {
          setStatus("error");
          setError("WebSocket 已断开");
        }
      };
    })();

    return () => {
      closed = true;
      cleanup();
      setStatus("idle");
    };
  }, [appId, enabled]);

  return { status, error };
}
