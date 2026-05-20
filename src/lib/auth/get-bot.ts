import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function getOwnedBot(appId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const bot = await prisma.bot.findUnique({ where: { appId } });
  if (!bot || bot.userId !== userId) return null;
  return bot;
}
