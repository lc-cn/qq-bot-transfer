import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export type Ed25519PrivateKey = ReturnType<typeof createPrivateKey>;

const SEED_SIZE = 32;

function seedFromSecret(secret: string): Buffer {
  const seed = Buffer.alloc(SEED_SIZE);
  Buffer.from(secret, "utf8").copy(seed, 0, 0, SEED_SIZE);
  return seed;
}

/** PKCS#8 Ed25519 private key from 32-byte seed (matches Go ed25519.NewKeyFromSeed). */
function privateKeyFromSeed(seed: Buffer) {
  const pkcs8Prefix = Buffer.from(
    "302e020100300506032b657004220420",
    "hex",
  );
  const der = Buffer.concat([pkcs8Prefix, seed]);
  return createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

export function deriveKeyPair(secret: string): {
  privateKey: ReturnType<typeof createPrivateKey>;
  publicKey: Buffer;
} {
  const seed = seedFromSecret(secret);
  const privateKey = privateKeyFromSeed(seed);
  const publicKey = createPublicKey(privateKey)
    .export({ type: "spki", format: "der" })
    .subarray(-32);
  return { privateKey, publicKey };
}

export function verifySignature(
  publicKey: Uint8Array,
  timestamp: string,
  body: string,
  hexSig: string,
): boolean {
  try {
    const sig = Buffer.from(hexSig, "hex");
    const msg = Buffer.from(timestamp + body, "utf8");
    const spki = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      Buffer.from(publicKey),
    ]);
    return verify(null, msg, { key: spki, format: "der", type: "spki" }, sig);
  } catch {
    return false;
  }
}

export function signChallenge(
  privateKey: Ed25519PrivateKey,
  eventTs: string,
  plainToken: string,
): string {
  const msg = Buffer.from(eventTs + plainToken, "utf8");
  return sign(null, msg, privateKey).toString("hex");
}
