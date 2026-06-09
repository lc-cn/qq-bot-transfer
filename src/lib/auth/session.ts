import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, type Bot, type User } from "@/lib/db";
import { bots, users } from "@drizzle/schema";

type Fail = { ok: false; response: NextResponse };
type Ok<T> = { ok: true } & T;

export async function getSessionUser(): Promise<User | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

function unauthorized(): Fail {
  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

function forbidden(): Fail {
  return {
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

export async function requireUser(): Promise<Ok<{ user: User }> | Fail> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return { ok: true, user };
}

export async function requireBotOwnership(
  appId: string,
): Promise<Ok<{ user: User; bot: Bot }> | Fail> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult;
  const db = await getDb();
  const [bot] = await db
    .select()
    .from(bots)
    .where(eq(bots.appId, appId))
    .limit(1);
  if (!bot || bot.userId !== authResult.user.id) return forbidden();
  return { ok: true, user: authResult.user, bot };
}
