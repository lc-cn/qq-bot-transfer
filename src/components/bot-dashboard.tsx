"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BotDialog } from "@/components/bot-dialog";
import type { BotRow } from "@/types/dashboard";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { botUrls } from "@/lib/utils";

export function BotDashboard() {
  const [bots, setBots] = useState<BotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BotRow | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/bots");
      if (!cancelled && res.ok) setBots(await res.json());
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleDelete(appId: string) {
    if (!confirm("确定删除该 Bot？")) return;
    await fetch(`/api/bots/${appId}`, { method: "DELETE" });
    setReloadKey((k) => k + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">我的 Bot</h1>
          <p className="mt-1 text-sm text-zinc-500">
            配置 QQ 机器人凭据，使用 Webhook → WebSocket 转发网关
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          新增 Bot
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">加载中…</p>
      ) : bots.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          暂无 Bot，点击「新增 Bot」开始配置
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {bots.map((bot) => {
            const urls = botUrls(bot.appId);
            return (
              <li
                key={bot.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium text-zinc-900">{bot.name}</h2>
                    <p className="text-sm text-zinc-500">
                      QQ: {bot.qq} · App ID: {bot.appId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(bot);
                        setDialogOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Link href={`/bots/${bot.appId}/events`}>
                      <Button variant="outline" size="sm">
                        事件
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDelete(bot.appId)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-xs text-zinc-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="font-medium text-zinc-700">Webhook</dt>
                    <dd className="break-all font-mono">{urls.webhook}</dd>
                    <CopyButton text={urls.webhook} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="font-medium text-zinc-700">Gateway API</dt>
                    <dd className="break-all font-mono">{urls.gateway}</dd>
                    <CopyButton text={urls.gateway} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="font-medium text-zinc-700">Auth API</dt>
                    <dd className="break-all font-mono">{urls.auth}</dd>
                    <CopyButton text={urls.auth} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <dt className="font-medium text-zinc-700">WebSocket</dt>
                    <dd className="break-all font-mono">{urls.websocket}</dd>
                    <CopyButton text={urls.websocket} />
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <BotDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        edit={editing}
      />
    </div>
  );
}
