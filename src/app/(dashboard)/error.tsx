"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">出错了</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {error.message || "加载页面时发生错误"}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
      >
        重试
      </button>
    </div>
  );
}
