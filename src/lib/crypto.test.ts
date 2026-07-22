import { describe, it, expect, beforeEach } from "vitest";
import { encryptSecret, decryptSecret, maskKey } from "@/lib/crypto";

describe("crypto (API key encryption at rest)", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-unit-tests";
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const secret = "sk-live-super-secret-api-key-1234567890";
    const encrypted = encryptSecret(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces different ciphertext for the same plaintext (random IV per call)", () => {
    const secret = "sk-live-same-key";
    const a = encryptSecret(secret);
    const b = encryptSecret(secret);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(secret);
    expect(decryptSecret(b)).toBe(secret);
  });

  it("never stores the plaintext directly in the encrypted payload", () => {
    const secret = "sk-live-do-not-leak-me";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
  });

  it("throws when ENCRYPTION_KEY is missing (fail closed, not open)", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret("anything")).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws on a malformed encrypted payload instead of returning garbage", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow(/Malformed encrypted secret/);
  });

  it("throws when the auth tag has been tampered with", () => {
    const encrypted = encryptSecret("sk-live-tamper-test");
    const [iv, tag, data] = encrypted.split(".");
    const tamperedTag = Buffer.from(tag, "base64");
    tamperedTag[0] ^= 0xff;
    const tampered = [iv, tamperedTag.toString("base64"), data].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("masks a key while preserving first/last 4 characters", () => {
    expect(maskKey("sk-1234567890abcdef")).toBe("sk-1••••••••cdef");
  });

  it("fully masks very short keys", () => {
    expect(maskKey("short")).toBe("••••••••");
  });
});
