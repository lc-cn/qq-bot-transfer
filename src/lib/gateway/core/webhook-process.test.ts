import { describe, it, expect } from "vitest";
import { botSigningFromSecret, processWebhookPayload } from "./webhook-process";
import { GatewaySeq } from "./gateway-seq";
import { sign } from "node:crypto";

const TEST_SECRET = "test-bot-secret-for-webhook-process";

function makeBot() {
  return botSigningFromSecret("bot-1", "app-123", TEST_SECRET);
}

function signBody(bot: ReturnType<typeof makeBot>, timestamp: string, body: string): string {
  const msg = Buffer.from(timestamp + body, "utf8");
  return sign(null, msg, bot.privateKey).toString("hex");
}

describe("botSigningFromSecret", () => {
  it("returns valid signing material", () => {
    const bot = makeBot();
    expect(bot.botId).toBe("bot-1");
    expect(bot.appId).toBe("app-123");
    expect(bot.publicKey).toHaveLength(32);
    expect(bot.privateKey).toBeDefined();
  });

  it("is deterministic for same secret", () => {
    const a = botSigningFromSecret("b", "a", TEST_SECRET);
    const b = botSigningFromSecret("b", "a", TEST_SECRET);
    expect(Buffer.from(a.publicKey).equals(Buffer.from(b.publicKey))).toBe(true);
  });
});

describe("processWebhookPayload", () => {
  const bot = makeBot();

  it("returns 400 when signature is missing", () => {
    const result = processWebhookPayload(bot, '{"op":0,"d":{}}', undefined, "123", new GatewaySeq(), 1);
    expect(result).toEqual({ status: 400, body: { msg: "missing signature" } });
  });

  it("returns 400 when timestamp is missing", () => {
    const result = processWebhookPayload(bot, '{"op":0,"d":{}}', "some-sig", undefined, new GatewaySeq(), 1);
    expect(result).toEqual({ status: 400, body: { msg: "missing signature" } });
  });

  it("returns 400 for invalid signature", () => {
    const result = processWebhookPayload(bot, '{"op":0,"d":{}}', "aa", "123", new GatewaySeq(), 1);
    expect(result).toEqual({ status: 400, body: { msg: "invalid signature" } });
  });

  it("returns 400 for invalid JSON body", () => {
    const ts = "123";
    const body = "not-json";
    const sig = signBody(bot, ts, body);
    const result = processWebhookPayload(bot, body, sig, ts, new GatewaySeq(), 1);
    expect(result).toEqual({ status: 400, body: { msg: "invalid json" } });
  });

  it("handles op=13 validation challenge", () => {
    const ts = "1700000000";
    const challengeBody = JSON.stringify({
      op: 13,
      d: { event_ts: ts, plain_token: "challenge-token" },
    });
    const sig = signBody(bot, ts, challengeBody);
    const result = processWebhookPayload(bot, challengeBody, sig, ts, new GatewaySeq(), 1);
    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.plain_token).toBe("challenge-token");
      expect(typeof result.body.signature).toBe("string");
    }
  });

  it("handles op=0 dispatch and returns forward object", () => {
    const ts = "1700000001";
    const dispatchBody = JSON.stringify({ op: 0, t: "MESSAGE_CREATE", d: { content: "hi" }, s: 5 });
    const sig = signBody(bot, ts, dispatchBody);
    const seq = new GatewaySeq();
    const result = processWebhookPayload(bot, dispatchBody, sig, ts, seq, 1);
    expect(result.status).toBe(204);
    if (result.status === 204) {
      expect(result.forward).toBeDefined();
      expect(result.forward!.seq).toBe(5); // uses present value
      expect(result.forward!.payload.op).toBe(0);
      expect(result.forward!.payload.t).toBe("MESSAGE_CREATE");
    }
  });

  it("op=0 dispatch with no clients still returns forward", () => {
    const ts = "1700000002";
    const body = JSON.stringify({ op: 0, d: { x: 1 }, s: 1 });
    const sig = signBody(bot, ts, body);
    const result = processWebhookPayload(bot, body, sig, ts, new GatewaySeq(), 0);
    expect(result.status).toBe(204);
    if (result.status === 204) {
      expect(result.forward).toBeDefined();
    }
  });

  it("returns 204 with no forward for unknown op", () => {
    const ts = "1700000003";
    const body = JSON.stringify({ op: 99, d: {} });
    const sig = signBody(bot, ts, body);
    const result = processWebhookPayload(bot, body, sig, ts, new GatewaySeq(), 1);
    expect(result).toEqual({ status: 204 });
  });
});
