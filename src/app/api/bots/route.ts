import { getCloudflareContext } from "@opennextjs/cloudflare";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto/secrets";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { botCreateSchema } from "@/lib/validators/bot";
import { bots } from "@drizzle/schema";

export async function GET() {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;
  const db = await getDb();
  const list = await db
    .select({
      id: bots.id,
      name: bots.name,
      qq: bots.qq,
      appId: bots.appId,
      createdAt: bots.createdAt,
      updatedAt: bots.updatedAt,
    })
    .from(bots)
    .where(eq(bots.userId, authResult.user.id))
    .orderBy(desc(bots.updatedAt));
  return NextResponse.json(list);
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
  const db = await getDb();
  const { env } = await getCloudflareContext({ async: true });
  try {
    const [bot] = await db
      .insert(bots)
      .values({
        userId: authResult.user.id,
        name,
        qq,
        appId,
        secretEnc: encryptSecret(clientSecret, env.ENCRYPTION_KEY),
      })
      .returning();
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
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return NextResponse.json({ error: "appId already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
