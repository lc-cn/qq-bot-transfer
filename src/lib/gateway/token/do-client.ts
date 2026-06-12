import { getCloudflareContext } from "@opennextjs/cloudflare";

const APP_ID_HEADER = "X-Bot-App-Id";

function internalRequest(
  path: string,
  init: RequestInit & { headers?: HeadersInit },
): Request {
  return new Request(`https://internal${path}`, init);
}

export async function registerTokenWithDo(
  appId: string,
  accessToken: string,
): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  const stub = env.BOT_GATEWAY.get(env.BOT_GATEWAY.idFromName(appId));
  await stub.fetch(
    internalRequest("/_internal/register-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [APP_ID_HEADER]: appId,
      },
      body: JSON.stringify({ accessToken }),
    }) as never,
  );
}

export async function invalidateDoBot(appId: string): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  const stub = env.BOT_GATEWAY.get(env.BOT_GATEWAY.idFromName(appId));
  await stub.fetch(
    internalRequest("/_internal/invalidate", {
      method: "POST",
      headers: { [APP_ID_HEADER]: appId },
    }) as never,
  );
}
