import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/secrets";
import { getDb } from "@/lib/db";
import { requireBotOwnership } from "@/lib/auth/session";
import { botUpdateSchema } from "@/lib/validators/bot";
import { invalidateDoBot } from "@/lib/gateway/do-client";
import { bots } from "@drizzle/schema";

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
  const patch: Partial<typeof bots.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.qq) patch.qq = parsed.data.qq;
  if (parsed.data.clientSecret) {
    const { env } = await getCloudflareContext({ async: true });
    patch.secretEnc = encryptSecret(
      parsed.data.clientSecret,
      env.ENCRYPTION_KEY,
    );
  }
  const db = await getDb();
  const [updated] = await db
    .update(bots)
    .set(patch)
    .where(eq(bots.id, bot.id))
    .returning();
  await invalidateDoBot(appId);
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
  const db = await getDb();
  await db.delete(bots).where(eq(bots.id, bot.id));
  await invalidateDoBot(appId);
  return NextResponse.json({ ok: true });
}
