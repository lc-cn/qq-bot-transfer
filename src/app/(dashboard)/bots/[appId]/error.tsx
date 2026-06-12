"use client";

import Link from "next/link";

export default function BotDetailError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← 返回 Dashboard
      </Link>
      <div className="mt-8 text-center">
        <h2 className="text-lg font-semibold text-zinc-900">加载 Bot 信息失败</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {error.message || "无法加载 Bot 详情"}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
        >
          重试
        </button>
      </div>
    </div>
  );
}
