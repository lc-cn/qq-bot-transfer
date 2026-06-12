import { describe, it, expect } from "vitest";
import { resolveGatewayWsUrl } from "./gateway-url";

describe("resolveGatewayWsUrl", () => {
  it("uses GATEWAY_WS_URL when provided", () => {
    const url = resolveGatewayWsUrl("app-1", { GATEWAY_WS_URL: "wss://gw.example.com/ws" });
    expect(url).toBe("wss://gw.example.com/ws/app-1");
  });

  it("strips trailing slash from GATEWAY_WS_URL", () => {
    const url = resolveGatewayWsUrl("app-1", { GATEWAY_WS_URL: "wss://gw.example.com/ws/" });
    expect(url).toBe("wss://gw.example.com/ws/app-1");
  });

  it("falls back to requestUrl with https→wss", () => {
    const requestUrl = new URL("https://example.com/gateway/app-1");
    const url = resolveGatewayWsUrl("app-1", {}, requestUrl);
    expect(url).toBe("wss://example.com/websocket/app-1");
  });

  it("falls back to requestUrl with http→ws", () => {
    const requestUrl = new URL("http://localhost:8787/gateway/app-1");
    const url = resolveGatewayWsUrl("app-1", {}, requestUrl);
    expect(url).toBe("ws://localhost:8787/websocket/app-1");
  });

  it("falls back to PUBLIC_URL", () => {
    const url = resolveGatewayWsUrl("app-1", { PUBLIC_URL: "https://public.example.com" });
    expect(url).toBe("wss://public.example.com/websocket/app-1");
  });

  it("falls back to localhost:8787 when nothing is set", () => {
    const url = resolveGatewayWsUrl("app-1", {});
    expect(url).toBe("ws://localhost:8787/websocket/app-1");
  });

  it("URL-encodes appId with special characters", () => {
    const url = resolveGatewayWsUrl("app/with/slash", { GATEWAY_WS_URL: "wss://gw.example.com" });
    expect(url).toBe("wss://gw.example.com/app%2Fwith%2Fslash");
  });

  it("GATEWAY_WS_URL takes priority over requestUrl", () => {
    const requestUrl = new URL("https://other.example.com/gateway/app-1");
    const url = resolveGatewayWsUrl("app-1", { GATEWAY_WS_URL: "wss://primary.com/ws" }, requestUrl);
    expect(url).toBe("wss://primary.com/ws/app-1");
  });
});
