import { count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireBotOwnership } from "@/lib/auth/session";
import { webhookEvents } from "@drizzle/schema";

type Params = { params: Promise<{ appId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) return result.response;
  const { bot } = result;
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );
  const offset = (page - 1) * limit;

  const db = await getDb();
  const items = await db
    .select({
      id: webhookEvents.id,
      op: webhookEvents.op,
      eventType: webhookEvents.eventType,
      payload: webhookEvents.payload,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .where(eq(webhookEvents.botId, bot.id))
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(webhookEvents)
    .where(eq(webhookEvents.botId, bot.id));

  return NextResponse.json({ items, total, page, limit });
}
