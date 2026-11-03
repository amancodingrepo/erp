import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { PUBLIC_DEFAULT_PASSWORD, hardenDefaultAccounts, shouldHardenDefaults } from "./default-credentials";
import { hashPassword } from "./password";

// argon: the format the app re-hashes to after a sign-in; otherwise the seed's original bcrypt.
async function store(rows: Array<{ username: string; password: string; isActive?: boolean; mustChangePassword?: boolean; argon?: boolean }>) {
  const users = await Promise.all(rows.map(async (r, i) => ({
    id: "u" + i, username: r.username, passwordHash: r.argon ? await hashPassword(r.password) : await bcrypt.hash(r.password, 4),
    isActive: r.isActive ?? true, mustChangePassword: r.mustChangePassword ?? false,
  })));
  const updates: Array<{ id: string; data: object }> = [];
  return {
    users, updates,
    findUsers: async (names: string[]) => users.filter((u) => names.includes(u.username)),
    update: async (id: string, data: object) => { updates.push({ id, data }); },
  };
}

describe("hardenDefaultAccounts", () => {
  it("switches off demo accounts and flags admins that still use a known password", async () => {
    const s = await store([
      { username: "admin", password: PUBLIC_DEFAULT_PASSWORD, argon: true },
      { username: "teacher", password: PUBLIC_DEFAULT_PASSWORD },
      { username: "student1", password: "Seed-Secret-1" },
      { username: "parent1", password: "changed-by-parent-99" },
    ]);
    const changed = await hardenDefaultAccounts(s, [PUBLIC_DEFAULT_PASSWORD, "Seed-Secret-1"]);
    expect(changed).toEqual([
      { username: "admin", action: "must-change" },
      { username: "teacher", action: "disabled" },
      { username: "student1", action: "disabled" },
    ]);
    expect(s.updates).toEqual([
      { id: "u0", data: { mustChangePassword: true } },
      { id: "u1", data: { isActive: false } },
      { id: "u2", data: { isActive: false } },
    ]);
  });
  it("never switches off an admin and leaves changed passwords alone", async () => {
    const s = await store([{ username: "admin", password: "a-strong-new-password" }, { username: "admin", password: PUBLIC_DEFAULT_PASSWORD, mustChangePassword: true }]);
    expect(await hardenDefaultAccounts(s, [PUBLIC_DEFAULT_PASSWORD])).toEqual([]);
    expect(s.updates).toEqual([]);
  });
  it("runs only in production unless opted out", () => {
    expect(shouldHardenDefaults({ NODE_ENV: "production" })).toBe(true);
    expect(shouldHardenDefaults({ NODE_ENV: "production", ALLOW_DEFAULT_PASSWORDS: "true" })).toBe(false);
    expect(shouldHardenDefaults({ NODE_ENV: "test" })).toBe(false);
    expect(shouldHardenDefaults({})).toBe(false);
  });
});
