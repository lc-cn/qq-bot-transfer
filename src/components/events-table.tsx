"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useBotGatewayWs,
  type LiveGatewayEvent,
} from "@/hooks/use-bot-gateway-ws";

type EventRow = {
  id: string;
  op: number | null;
  eventType: string | null;
  payload: unknown;
  receivedAt: string;
};

const LIVE_MAX_ITEMS = 200;

export function EventsTable({ appId }: { appId: string }) {
  const [items, setItems] = useState<EventRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const limit = 20;

  const prependEvent = useCallback((row: EventRow) => {
    setItems((prev) => {
      if (prev.some((e) => e.id === row.id)) return prev;
      return [row, ...prev].slice(0, LIVE_MAX_ITEMS);
    });
    setTotal((t) => t + 1);
  }, []);

  const onGatewayEvent = useCallback(
    (ev: LiveGatewayEvent) => prependEvent(ev),
    [prependEvent],
  );

  const { status: wsStatus, error: wsError } = useBotGatewayWs(
    appId,
    live,
    onGatewayEvent,
  );

  const loadPage = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/bots/${encodeURIComponent(appId)}/events?page=${page}&limit=${limit}`,
    );
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [appId, page, limit]);

  useEffect(() => {
    if (live) return;
    void loadPage();
  }, [live, loadPage]);

  useEffect(() => {
    if (!live) return;
    void (async () => {
      setLoading(true);
      const res = await fetch(
        `/api/bots/${encodeURIComponent(appId)}/events?page=1&limit=${limit}`,
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
      }
      setLoading(false);
    })();
  }, [live, appId, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const toggleLive = () => {
    if (live) {
      setLive(false);
      setPage(1);
      return;
    }
    setLive(true);
    setPage(1);
  };

  const liveLabel =
    wsStatus === "connecting"
      ? "连接网关…"
      : wsStatus === "connected"
        ? "已连接 Bot WebSocket"
        : wsStatus === "error"
          ? (wsError ?? "连接失败")
          : "实时监听中";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={live}
            onClick={toggleLive}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              live ? "bg-emerald-600" : "bg-zinc-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                live ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-zinc-700">
            Live {live ? "开启" : "关闭"}
          </span>
          {live && wsStatus === "connected" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {liveLabel}
            </span>
          )}
          {live && wsStatus !== "connected" && (
            <span
              className={`text-xs ${wsStatus === "error" ? "text-red-600" : "text-zinc-500"}`}
            >
              {liveLabel}
            </span>
          )}
        </div>
        {live && wsStatus === "connected" && (
          <span className="text-xs text-zinc-500">
            已连接：GET /api/bots/connect → {`/websocket/${appId}`}
          </span>
        )}
      </div>

      {live && wsStatus === "error" && wsError && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {wsError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {live
            ? "已连接网关，等待 Webhook 事件经网关转发…"
            : "暂无 Webhook 事件。请在 QQ 开放平台将回调地址配置为 Webhook URL。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((ev) => (
            <li
              key={ev.id}
              className="rounded-lg border border-zinc-200 bg-white p-4 text-sm"
            >
              <div className="flex flex-wrap gap-3 text-zinc-600">
                <span>{new Date(ev.receivedAt).toLocaleString("zh-CN")}</span>
                <span>op={ev.op ?? "-"}</span>
                <span>t={ev.eventType ?? "-"}</span>
              </div>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-800">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}

      {!live && total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            共 {total} 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
