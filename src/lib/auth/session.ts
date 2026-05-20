import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Bot, User } from "@prisma/client";

type Fail = { ok: false; response: NextResponse };
type Ok<T> = { ok: true } & T;

export async function getSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
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
  const bot = await prisma.bot.findUnique({ where: { appId } });
  if (!bot || bot.userId !== authResult.user.id) return forbidden();
  return { ok: true, user: authResult.user, bot };
}
