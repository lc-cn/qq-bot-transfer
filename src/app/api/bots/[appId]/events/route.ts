import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBotOwnership } from "@/lib/auth/session";

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
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.webhookEvent.findMany({
      where: { botId: bot.id },
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        op: true,
        eventType: true,
        payload: true,
        receivedAt: true,
      },
    }),
    prisma.webhookEvent.count({ where: { botId: bot.id } }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
