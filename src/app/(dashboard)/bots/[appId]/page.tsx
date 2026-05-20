import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwnedBot } from "@/lib/auth/get-bot";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { botUrls } from "@/lib/utils";

type Props = { params: Promise<{ appId: string }> };

export default async function BotDetailPage({ params }: Props) {
  const { appId } = await params;
  const bot = await getOwnedBot(appId);
  if (!bot) notFound();

  const urls = botUrls(bot.appId);
  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← 返回 Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{bot.name}</h1>
      <p className="text-sm text-zinc-500">App ID: {bot.appId}</p>
      <dl className="mt-6 space-y-3 text-sm">
        {(
          [
            ["Webhook", urls.webhook],
            ["Gateway API", urls.gateway],
            ["Auth API", urls.auth],
            ["WebSocket", urls.websocket],
          ] as const
        ).map(([label, url]) => (
          <div key={label} className="flex flex-wrap items-center gap-2">
            <dt className="w-28 font-medium text-zinc-700">{label}</dt>
            <dd className="flex-1 break-all font-mono text-zinc-600">{url}</dd>
            <CopyButton text={url} />
          </div>
        ))}
      </dl>
      <div className="mt-6">
        <Link href={`/bots/${bot.appId}/events`}>
          <Button>查看 Webhook 事件</Button>
        </Link>
      </div>
    </div>
  );
}
