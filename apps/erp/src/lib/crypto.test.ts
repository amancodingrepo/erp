import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptField,
  encryptField,
  fieldEncryptionKeyBytes,
  maskId,
} from "./crypto";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("field encryption", () => {
  it("round-trips AES-256-GCM", () => {
    vi.stubEnv("FIELD_ENCRYPTION_KEY", "unit-test-field-key-32-bytes-min!!");
    const stored = encryptField("123412341234");
    expect(stored).toMatch(/^v1:/);
    expect(decryptField(stored)).toBe("123412341234");
  });

  it("masks identifiers keeping last 4", () => {
    expect(maskId("123412341234")).toBe("********1234");
    expect(maskId(null)).toBeNull();
  });

  it("requires FIELD_ENCRYPTION_KEY in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FIELD_ENCRYPTION_KEY", "");
    expect(() => fieldEncryptionKeyBytes()).toThrow(/FIELD_ENCRYPTION_KEY/);
  });
});
