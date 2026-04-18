import * as Crypto from "expo-crypto";

const SALT = "cmsApp_s4lt_2024";

export async function sha256(input: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${input}${SALT}`);
}

export async function legacySha256(input: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export async function matchesPassword(input: string, storedHash?: string | null) {
  if (!storedHash) {
    return false;
  }

  const [saltedHash, unsaltedHash] = await Promise.all([sha256(input), legacySha256(input)]);
  return storedHash === saltedHash || storedHash === unsaltedHash;
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}`;
}
