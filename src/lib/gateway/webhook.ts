import { signChallenge, verifySignature } from "@/lib/crypto/ed25519";
import { globalHub } from "./bot-runtime";
import { persistWebhookEvent } from "./events";

type WebhookPayload = {
  op: number;
  id?: string;
  t?: string;
  d: unknown;
  s?: number;
};

type ValidationChallenge = {
  event_ts: string;
  plain_token: string;
};

export type WebhookResult =
  | { status: 404; body: { msg: string } }
  | { status: 400; body: { msg: string } }
  | { status: 500; body: { msg: string } }
  | { status: 200; body: { plain_token: string; signature: string } }
  | { status: 204 };

export async function processWebhook(
  appId: string,
  rawBody: string,
  sign: string | undefined,
  timestamp: string | undefined,
): Promise<WebhookResult> {
  const bot = await globalHub.getOrLoad(appId);
  if (!bot) {
    console.log(`[webhook] bot ${appId} not registered`);
    return { status: 404, body: { msg: "bot not registered" } };
  }

  if (bot.hasKeys()) {
    if (!sign || !timestamp) {
      return { status: 400, body: { msg: "missing signature" } };
    }
    if (!verifySignature(bot.publicKey, timestamp, rawBody, sign)) {
      console.log(`[webhook] bot=${appId} invalid signature`);
      return { status: 400, body: { msg: "invalid signature" } };
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return { status: 400, body: { msg: "invalid json" } };
  }

  switch (payload.op) {
    case 13: {
      if (!bot.hasKeys()) {
        return { status: 500, body: { msg: "bot has no signing keys" } };
      }
      const challenge = payload.d as ValidationChallenge;
      const signature = signChallenge(
        bot.privateKey,
        challenge.event_ts,
        challenge.plain_token,
      );
      console.log(`[webhook] bot=${appId} op=13 challenge`);
      return {
        status: 200,
        body: { plain_token: challenge.plain_token, signature },
      };
    }
    case 0: {
      const clients = bot.clientCount();
      console.log(
        `[webhook] bot=${appId} op=0 event=${payload.t} clients=${clients}`,
      );
      if (clients === 0) {
        console.warn(
          `[webhook] bot=${appId} no websocket clients connected; event persisted only`,
        );
      }
      bot.forwardEvent(payload);
      void persistWebhookEvent(bot.botId, payload);
      return { status: 204 };
    }
    default:
      console.log(`[webhook] bot=${appId} unknown op=${payload.op}`);
      return { status: 204 };
  }
}
