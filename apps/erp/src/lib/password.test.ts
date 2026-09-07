import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from "./password";

describe("password hashing", () => {
  it("stores Argon2id and verifies the same secret", async () => {
    const stored = await hashPassword("Admin@12345");
    expect(stored.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("Admin@12345", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
    expect(passwordNeedsRehash(stored)).toBe(false);
  });

  it("still verifies bcrypt hashes used by seed admin", async () => {
    const legacy = await bcrypt.hash("Admin@12345", 12);
    expect(await verifyPassword("Admin@12345", legacy)).toBe(true);
    expect(await verifyPassword("wrong", legacy)).toBe(false);
    expect(passwordNeedsRehash(legacy)).toBe(true);
  });
});
