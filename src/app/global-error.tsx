"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">应用错误</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {error.message || "发生了意外错误"}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
