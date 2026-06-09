import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { bots } from "@drizzle/schema";

export async function getOwnedBot(appId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const db = await getDb();
  const [bot] = await db
    .select()
    .from(bots)
    .where(eq(bots.appId, appId))
    .limit(1);
  if (!bot || bot.userId !== userId) return null;
  return bot;
}
