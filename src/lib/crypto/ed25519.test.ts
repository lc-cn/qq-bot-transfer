import { describe, it, expect } from "vitest";
import { sign } from "node:crypto";
import { deriveKeyPair, verifySignature, signChallenge } from "./ed25519";

const TEST_SECRET = "test-bot-secret-for-ed25519-testing";

describe("deriveKeyPair", () => {
  it("returns deterministic key pair for same secret", () => {
    const a = deriveKeyPair(TEST_SECRET);
    const b = deriveKeyPair(TEST_SECRET);
    expect(Buffer.from(a.publicKey).equals(Buffer.from(b.publicKey))).toBe(true);
  });

  it("produces 32-byte public key", () => {
    const { publicKey } = deriveKeyPair(TEST_SECRET);
    expect(publicKey).toHaveLength(32);
  });

  it("produces different keys for different secrets", () => {
    const a = deriveKeyPair("secret-a");
    const b = deriveKeyPair("secret-b");
    expect(Buffer.from(a.publicKey).equals(Buffer.from(b.publicKey))).toBe(false);
  });

  it("pads short secrets with zeros", () => {
    const short = deriveKeyPair("abc");
    const padded = deriveKeyPair("abc\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0");
    expect(Buffer.from(short.publicKey).equals(Buffer.from(padded.publicKey))).toBe(true);
  });
});

describe("verifySignature", () => {
  const { privateKey, publicKey } = deriveKeyPair(TEST_SECRET);

  function signBody(timestamp: string, body: string): string {
    const msg = Buffer.from(timestamp + body, "utf8");
    return sign(null, msg, privateKey).toString("hex");
  }

  it("accepts a valid signature", () => {
    const timestamp = "1234567890";
    const body = '{"op":0,"d":{}}';
    const sig = signBody(timestamp, body);
    expect(verifySignature(publicKey, timestamp, body, sig)).toBe(true);
  });

  it("rejects tampered body", () => {
    const timestamp = "1234567890";
    const sig = signBody(timestamp, '{"op":0}');
    expect(verifySignature(publicKey, timestamp, '{"op":1}', sig)).toBe(false);
  });

  it("rejects tampered timestamp", () => {
    const sig = signBody("111", '{"op":0}');
    expect(verifySignature(publicKey, "222", '{"op":0}', sig)).toBe(false);
  });

  it("rejects signature from different key", () => {
    const other = deriveKeyPair("other-secret");
    const sig = signBody("123", '{"op":0}');
    // sign with `other`, verify with original publicKey
    const msg = Buffer.from("123" + '{"op":0}', "utf8");
    const otherSig = sign(null, msg, other.privateKey).toString("hex");
    expect(verifySignature(publicKey, "123", '{"op":0}', otherSig)).toBe(false);
  });

  it("rejects malformed hex signature", () => {
    expect(verifySignature(publicKey, "123", "body", "zzzz")).toBe(false);
  });
});

describe("signChallenge", () => {
  const { privateKey, publicKey } = deriveKeyPair(TEST_SECRET);

  it("produces consistent signature for same input", () => {
    const a = signChallenge(privateKey, "ts1", "token1");
    const b = signChallenge(privateKey, "ts1", "token1");
    expect(a).toBe(b);
  });

  it("produces hex-encoded signature", () => {
    const sig = signChallenge(privateKey, "ts", "token");
    expect(sig).toMatch(/^[0-9a-f]+$/);
  });

  it("signature is verifiable with the corresponding public key", () => {
    const eventTs = "1700000000";
    const plainToken = "challenge-token-123";
    const sig = signChallenge(privateKey, eventTs, plainToken);
    expect(verifySignature(publicKey, eventTs, plainToken, sig)).toBe(true);
  });

  it("different inputs produce different signatures", () => {
    const a = signChallenge(privateKey, "ts1", "token1");
    const b = signChallenge(privateKey, "ts2", "token2");
    expect(a).not.toBe(b);
  });
});
