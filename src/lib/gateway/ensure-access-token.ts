import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto/secrets";
import { getDb } from "@/lib/db";
import { registerTokenWithDo } from "@/lib/gateway/do-client";
import { fetchAccessToken } from "./token-manager";
import { bots } from "@drizzle/schema";

export async function ensureBotAccessToken(appId: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  const db = await getDb();
  const [dbBot] = await db
    .select()
    .from(bots)
    .where(eq(bots.appId, appId))
    .limit(1);
  if (!dbBot) return null;

  const { env } = await getCloudflareContext({ async: true });
  const secret = decryptSecret(dbBot.secretEnc, env.ENCRYPTION_KEY);
  const { accessToken, expiresIn } = await fetchAccessToken(appId, secret);
  await registerTokenWithDo(appId, accessToken);
  return { accessToken, expiresIn };
}
