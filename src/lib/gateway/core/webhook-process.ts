import { signChallenge, verifySignature } from "@/lib/crypto/ed25519";
import { deriveKeyPair } from "@/lib/crypto/ed25519";
import { buildDispatch, GatewaySeq } from "./gateway-seq";
import type {
  BotSigningMaterial,
  GatewayDispatch,
  WebhookPayload,
  WebhookResult,
} from "./types";

type ValidationChallenge = {
  event_ts: string;
  plain_token: string;
};

export function botSigningFromSecret(
  botId: string,
  appId: string,
  secret: string,
): BotSigningMaterial {
  const keys = deriveKeyPair(secret);
  return {
    botId,
    appId,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}

export function processWebhookPayload(
  bot: BotSigningMaterial,
  rawBody: string,
  sign: string | undefined,
  timestamp: string | undefined,
  seqState: GatewaySeq,
  clientCount: number,
): WebhookResult {
  if (bot.publicKey.length > 0) {
    if (!sign || !timestamp) {
      return { status: 400, body: { msg: "missing signature" } };
    }
    if (!verifySignature(bot.publicKey, timestamp, rawBody, sign)) {
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
      const challenge = payload.d as ValidationChallenge;
      const signature = signChallenge(
        bot.privateKey,
        challenge.event_ts,
        challenge.plain_token,
      );
      return {
        status: 200,
        body: { plain_token: challenge.plain_token, signature },
      };
    }
    case 0: {
      const seq = seqState.next(payload.s);
      const dispatch = buildDispatch(payload, seq) as GatewayDispatch;
      if (clientCount === 0) {
        console.warn(
          `[webhook] bot=${bot.appId} no websocket clients; event queued only`,
        );
      }
      return {
        status: 204,
        forward: { payload, seq, eventForQueue: { ...payload, s: seq } },
      };
    }
    default:
      return { status: 204 };
  }
}
