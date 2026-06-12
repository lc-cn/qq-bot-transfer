import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "./secrets";

const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips plaintext", () => {
    const plain = "my-super-secret-client-secret";
    const enc = encryptSecret(plain, TEST_KEY);
    const dec = decryptSecret(enc, TEST_KEY);
    expect(dec).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plain = "same-secret";
    const a = encryptSecret(plain, TEST_KEY);
    const b = encryptSecret(plain, TEST_KEY);
    expect(a).not.toBe(b);
    // but both decrypt to the same plaintext
    expect(decryptSecret(a, TEST_KEY)).toBe(plain);
    expect(decryptSecret(b, TEST_KEY)).toBe(plain);
  });

  it("works with unicode plaintext", () => {
    const plain = "你好世界🔐";
    const enc = encryptSecret(plain, TEST_KEY);
    expect(decryptSecret(enc, TEST_KEY)).toBe(plain);
  });

  it("works with empty string", () => {
    const enc = encryptSecret("", TEST_KEY);
    expect(decryptSecret(enc, TEST_KEY)).toBe("");
  });

  it("throws on wrong key", () => {
    const enc = encryptSecret("secret", TEST_KEY);
    const wrongKey = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    expect(() => decryptSecret(enc, wrongKey)).toThrow();
  });

  it("throws on invalid key length", () => {
    expect(() => encryptSecret("x", "short")).toThrow(
      "ENCRYPTION_KEY must be 64 hex characters",
    );
  });

  it("throws on missing key when env is unset", () => {
    const orig = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => encryptSecret("x")).toThrow("ENCRYPTION_KEY must be 64 hex characters");
    } finally {
      if (orig) process.env.ENCRYPTION_KEY = orig;
    }
  });

  it("throws on corrupted ciphertext", () => {
    const enc = encryptSecret("secret", TEST_KEY);
    const corrupted = enc.slice(0, -4) + "XXXX";
    expect(() => decryptSecret(corrupted, TEST_KEY)).toThrow();
  });
});
