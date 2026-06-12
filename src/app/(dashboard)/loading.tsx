export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      <p className="mt-3 text-sm text-zinc-500">加载中...</p>
    </div>
  );
}
