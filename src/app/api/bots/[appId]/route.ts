import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db";
import { requireBotOwnership } from "@/lib/auth/session";
import { botUpdateSchema } from "@/lib/validators/bot";
import { globalHub } from "@/lib/gateway/bot-runtime";

type Params = { params: Promise<{ appId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) return result.response;
  const { bot } = result;
  return NextResponse.json({
    id: bot.id,
    name: bot.name,
    qq: bot.qq,
    appId: bot.appId,
    createdAt: bot.createdAt,
    updatedAt: bot.updatedAt,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) return result.response;
  const { bot } = result;
  const body = await request.json();
  const parsed = botUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data: { name?: string; qq?: string; secretEnc?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.qq) data.qq = parsed.data.qq;
  if (parsed.data.clientSecret) {
    data.secretEnc = encryptSecret(parsed.data.clientSecret);
  }
  const updated = await prisma.bot.update({
    where: { id: bot.id },
    data,
  });
  globalHub.evict(appId);
  await globalHub.getOrLoad(appId);
  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    qq: updated.qq,
    appId: updated.appId,
    updatedAt: updated.updatedAt,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { appId } = await params;
  const result = await requireBotOwnership(appId);
  if (!result.ok) return result.response;
  const { bot } = result;
  globalHub.evict(appId);
  await prisma.bot.delete({ where: { id: bot.id } });
  return NextResponse.json({ ok: true });
}
