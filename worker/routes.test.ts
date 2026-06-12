import { describe, it, expect } from "vitest";
import { parseGatewayRoute, gatewayAppId, type GatewayRoute } from "./routes";

describe("parseGatewayRoute", () => {
  it("matches /webhook/{appId}", () => {
    const route = parseGatewayRoute(new URL("https://example.com/webhook/12345"));
    expect(route).toEqual({ kind: "webhook", appId: "12345" });
  });

  it("matches /websocket/{appId}", () => {
    const route = parseGatewayRoute(new URL("https://example.com/websocket/abc"));
    expect(route).toEqual({ kind: "websocket", appId: "abc" });
  });

  it("matches /gateway/{appId}", () => {
    const route = parseGatewayRoute(new URL("https://example.com/gateway/mybot"));
    expect(route).toEqual({ kind: "gateway", appId: "mybot" });
  });

  it("matches /gateway/bot/{appId} before /gateway/{appId}", () => {
    const route = parseGatewayRoute(new URL("https://example.com/gateway/bot/botid"));
    expect(route).toEqual({ kind: "gateway_bot", appId: "botid" });
  });

  it("matches /app/getAppAccessToken as auth", () => {
    const route = parseGatewayRoute(new URL("https://example.com/app/getAppAccessToken"));
    expect(route).toEqual({ kind: "auth", appId: null });
  });

  it("handles trailing slash", () => {
    const route = parseGatewayRoute(new URL("https://example.com/webhook/app123/"));
    expect(route).toEqual({ kind: "webhook", appId: "app123" });
  });

  it("decodes URL-encoded appId", () => {
    const route = parseGatewayRoute(new URL("https://example.com/webhook/hello%20world"));
    expect(route).toEqual({ kind: "webhook", appId: "hello world" });
  });

  it("returns null for unknown paths", () => {
    expect(parseGatewayRoute(new URL("https://example.com/unknown"))).toBeNull();
    expect(parseGatewayRoute(new URL("https://example.com/"))).toBeNull();
    expect(parseGatewayRoute(new URL("https://example.com/api/bots"))).toBeNull();
  });

  it("returns null for partial matches", () => {
    expect(parseGatewayRoute(new URL("https://example.com/webhook/"))).toBeNull();
    expect(parseGatewayRoute(new URL("https://example.com/gateway/"))).toBeNull();
    expect(parseGatewayRoute(new URL("https://example.com/app/notAuth"))).toBeNull();
  });
});

describe("gatewayAppId", () => {
  it("returns appId from typed routes", () => {
    expect(gatewayAppId({ kind: "webhook", appId: "123" })).toBe("123");
    expect(gatewayAppId({ kind: "gateway_bot", appId: "abc" })).toBe("abc");
  });

  it("returns null for auth route", () => {
    expect(gatewayAppId({ kind: "auth", appId: null })).toBeNull();
  });
});
