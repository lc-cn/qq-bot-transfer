import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { botCreateSchema } from "@/lib/validators/bot";
import { globalHub } from "@/lib/gateway/bot-runtime";

export async function GET() {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;
  const bots = await prisma.bot.findMany({
    where: { userId: authResult.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      qq: true,
      appId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(bots);
}

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;
  const body = await request.json();
  const parsed = botCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, qq, appId, clientSecret } = parsed.data;
  try {
    const bot = await prisma.bot.create({
      data: {
        userId: authResult.user.id,
        name,
        qq,
        appId,
        secretEnc: encryptSecret(clientSecret),
      },
    });
    await globalHub.getOrLoad(appId);
    return NextResponse.json({
      id: bot.id,
      name: bot.name,
      qq: bot.qq,
      appId: bot.appId,
      createdAt: bot.createdAt,
      updatedAt: bot.updatedAt,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "create failed";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "appId already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
