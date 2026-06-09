"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BotRow = {
  id: string;
  name: string;
  qq: string;
  appId: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  edit?: BotRow | null;
};

export function BotDialog({ open, onClose, onSaved, edit }: Props) {
  const [qq, setQq] = useState("");
  const [name, setName] = useState("");
  const [appId, setAppId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(edit);

  useEffect(() => {
    if (!open) return;
    setQq(edit?.qq ?? "");
    setName(edit?.name ?? "");
    setAppId(edit?.appId ?? "");
    setClientSecret("");
    setError(null);
  }, [open, edit]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = isEdit ? `/api/bots/${edit!.appId}` : "/api/bots";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, string> = { name, qq };
      if (!isEdit) {
        body.appId = appId;
        body.clientSecret = clientSecret;
      } else if (clientSecret) {
        body.clientSecret = clientSecret;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error),
        );
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">
          {isEdit ? "编辑 Bot" : "新增 Bot"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="qq">Bot QQ</Label>
            <Input
              id="qq"
              value={qq}
              onChange={(e) => setQq(e.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]+"
              placeholder="机器人 QQ 号"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Bot 名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="便于识别的名称"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="appId">Bot App ID</Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              required
              disabled={isEdit}
              inputMode="numeric"
              pattern="[0-9]+"
              placeholder="开放平台 App ID"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="secret">
              Bot Secret{isEdit ? "（留空则不修改）" : ""}
            </Label>
            <Input
              id="secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required={!isEdit}
              placeholder="开放平台 App Secret"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中…" : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
