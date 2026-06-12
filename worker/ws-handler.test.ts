import { describe, it, expect } from "vitest";
import {
  parseWsMessage,
  buildHelloPayload,
  buildReadyPayload,
  buildInvalidSessionPayload,
  buildHeartbeatAck,
} from "./ws-handler";
import { Op } from "../src/lib/gateway/ws-protocol";

describe("parseWsMessage", () => {
  it("parses valid JSON string", () => {
    const msg = parseWsMessage('{"op":1,"d":null}');
    expect(msg).toEqual({ op: 1, d: null });
  });

  it("parses ArrayBuffer input", () => {
    const buf = new TextEncoder().encode('{"op":10,"d":{"heartbeat_interval":30000}}');
    const msg = parseWsMessage(buf.buffer as ArrayBuffer);
    expect(msg).toEqual({ op: 10, d: { heartbeat_interval: 30000 } });
  });

  it("returns null for invalid JSON", () => {
    expect(parseWsMessage("not json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseWsMessage("")).toBeNull();
  });
});

describe("buildHelloPayload", () => {
  it("builds op=10 hello with heartbeat interval", () => {
    const payload = JSON.parse(buildHelloPayload(30000));
    expect(payload.op).toBe(Op.Hello);
    expect(payload.d.heartbeat_interval).toBe(30000);
  });

  it("uses provided interval", () => {
    const payload = JSON.parse(buildHelloPayload(60000));
    expect(payload.d.heartbeat_interval).toBe(60000);
  });
});

describe("buildReadyPayload", () => {
  it("builds op=0 READY with session info", () => {
    const payload = JSON.parse(
      buildReadyPayload("app-123", [0, 1], "sess-abc", { name: "MyBot", qq: "12345" }),
    );
    expect(payload.op).toBe(Op.Dispatch);
    expect(payload.t).toBe("READY");
    expect(payload.s).toBe(1);
    expect(payload.d.session_id).toBe("sess-abc");
    expect(payload.d.app_id).toBe("app-123");
    expect(payload.d.shard).toEqual([0, 1]);
    expect(payload.d.user.username).toBe("MyBot");
    expect(payload.d.user.id).toBe("12345");
  });

  it("falls back to appId when meta is empty", () => {
    const payload = JSON.parse(
      buildReadyPayload("app-fallback", [0, 1], "sess-1", {}),
    );
    expect(payload.d.user.username).toBe("app-fallback");
    expect(payload.d.user.id).toBe("app-fallback");
  });

  it("uses appId for id when qq is empty string", () => {
    const payload = JSON.parse(
      buildReadyPayload("app-x", [0, 1], "s", { name: "Bot", qq: "" }),
    );
    expect(payload.d.user.id).toBe("app-x");
    expect(payload.d.user.username).toBe("Bot");
  });
});

describe("buildInvalidSessionPayload", () => {
  it("builds op=9 with reason", () => {
    const payload = JSON.parse(buildInvalidSessionPayload("auth failed"));
    expect(payload.op).toBe(Op.InvalidSession);
    expect(payload.d.reason).toBe("auth failed");
  });
});

describe("buildHeartbeatAck", () => {
  it("builds op=11", () => {
    const payload = JSON.parse(buildHeartbeatAck());
    expect(payload.op).toBe(Op.HeartbeatACK);
    expect(Object.keys(payload)).toHaveLength(1);
  });
});
