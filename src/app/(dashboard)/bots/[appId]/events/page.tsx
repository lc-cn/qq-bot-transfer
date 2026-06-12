import Link from "next/link";
import { notFound } from "next/navigation";
import { EventsTable } from "@/components/events-table";
import { requireBotOwnership } from "@/lib/auth/session";

type Props = { params: Promise<{ appId: string }> };

export default async function BotEventsPage({ params }: Props) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) notFound();
  const { bot } = result;

  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← 返回 Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{bot.name} — 事件</h1>
      <p className="mt-1 text-sm text-zinc-500">App ID: {bot.appId}</p>
      <div className="mt-6">
        <EventsTable appId={bot.appId} />
      </div>
    </div>
  );
}
