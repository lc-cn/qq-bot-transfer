import { decryptSecret } from "@/lib/crypto/secrets";
import { prisma } from "@/lib/db";
import { fetchAccessToken } from "./token-manager";
import { globalHub } from "./bot-runtime";

export async function ensureBotAccessToken(appId: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  const dbBot = await prisma.bot.findUnique({ where: { appId } });
  if (!dbBot) return null;

  const rt = await globalHub.getOrLoad(appId);
  if (!rt) return null;

  const existing = rt.tokenMgr.token();
  if (existing) {
    return { accessToken: existing, expiresIn: 7200 };
  }

  const secret = decryptSecret(dbBot.secretEnc);
  const { accessToken, expiresIn } = await fetchAccessToken(appId, secret);
  await globalHub.registerFromAuth(
    appId,
    dbBot.id,
    secret,
    accessToken,
    expiresIn,
  );
  return { accessToken, expiresIn };
}
