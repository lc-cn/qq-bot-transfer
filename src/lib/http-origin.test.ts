import { describe, it, expect } from "vitest";
import { firstHeader, isLocalHost, originFromHeaderGet, forwardedFromHeaders } from "./http-origin";

describe("firstHeader", () => {
  it("returns single value as-is", () => {
    expect(firstHeader("example.com")).toBe("example.com");
  });

  it("returns first from comma-separated values", () => {
    expect(firstHeader("host1.com, host2.com")).toBe("host1.com");
  });

  it("returns first from array", () => {
    expect(firstHeader(["host1.com", "host2.com"])).toBe("host1.com");
  });

  it("returns undefined for null", () => {
    expect(firstHeader(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(firstHeader(undefined)).toBeUndefined();
  });

  it("trims whitespace", () => {
    expect(firstHeader("  host.com  ")).toBe("host.com");
  });
});

describe("isLocalHost", () => {
  it("detects localhost", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("localhost:3000")).toBe(true);
  });

  it("detects 127.0.0.1", () => {
    expect(isLocalHost("127.0.0.1:8787")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
  });

  it("detects .local domains", () => {
    expect(isLocalHost("my-mac.local")).toBe(true);
    // note: with port, endsWith(".local") doesn't match — that's correct
    expect(isLocalHost("machine.local:3000")).toBe(false);
  });

  it("returns false for normal domains", () => {
    expect(isLocalHost("example.com")).toBe(false);
    expect(isLocalHost("bots.l2cl.link")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isLocalHost("LOCALHOST")).toBe(true);
    expect(isLocalHost("MyMac.LOCAL")).toBe(true);
  });
});

describe("originFromHeaderGet", () => {
  const makeHeaders = (entries: Record<string, string>) => {
    const map = new Map(Object.entries(entries));
    return (name: string) => map.get(name.toLowerCase()) ?? null;
  };

  it("uses x-forwarded-host and x-forwarded-proto", () => {
    const get = makeHeaders({
      "x-forwarded-host": "proxy.example.com",
      "x-forwarded-proto": "https",
    });
    expect(originFromHeaderGet(get)).toBe("https://proxy.example.com");
  });

  it("falls back to host header", () => {
    const get = makeHeaders({ host: "direct.example.com" });
    expect(originFromHeaderGet(get)).toBe("https://direct.example.com");
  });

  it("uses http for localhost", () => {
    const get = makeHeaders({ host: "localhost:3000" });
    expect(originFromHeaderGet(get)).toBe("http://localhost:3000");
  });

  it("falls back to provided fallback", () => {
    const get = makeHeaders({});
    expect(originFromHeaderGet(get, "https://fallback.com")).toBe("https://fallback.com");
  });

  it("strips trailing slash from fallback", () => {
    const get = makeHeaders({});
    expect(originFromHeaderGet(get, "https://fallback.com/")).toBe("https://fallback.com");
  });
});

describe("forwardedFromHeaders", () => {
  it("returns host and proto from headers", () => {
    const headers = {
      get: (name: string) => {
        if (name === "x-forwarded-host") return "example.com";
        if (name === "x-forwarded-proto") return "https";
        return null;
      },
    };
    expect(forwardedFromHeaders(headers)).toEqual({ host: "example.com", proto: "https" });
  });

  it("throws when Host header is missing", () => {
    const headers = { get: () => null };
    expect(() => forwardedFromHeaders(headers)).toThrow("missing Host header");
  });
});
