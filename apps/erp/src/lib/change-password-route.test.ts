import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "./password";

// Regression: sign-in re-hashes passwords to argon2id, and the School World change-password
// route used a bcrypt-only check, so it said "Current password is incorrect" to everyone who
// had signed in. The route must accept both formats.
const mocks = vi.hoisted(() => {
  const account = { id: "u1", passwordHash: "", email: "a@x", username: "admin", firstName: "A", lastName: "B", mustChangePassword: true, phone: null };
  const saved: string[] = [];
  return { account, saved };
});
const { account, saved } = mocks;

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: async () => mocks.account,
      update: async (args: { data: { passwordHash: string } }) => {
        mocks.saved.push(args.data.passwordHash);
        return { ...mocks.account, ...args.data, mustChangePassword: false };
      },
    },
  },
}));
vi.mock("@/lib/principal", () => ({ principalFromRequest: async () => ({ id: "u1", campusId: "c1", actorType: "STAFF", roles: ["SuperAdmin"], permissions: [] }) }));
vi.mock("@/lib/campus", () => ({ campusSummary: async () => ({ id: "c1", name: "Main", code: "MAIN" }) }));

const call = async (currentPassword: string, newPassword: string) => {
  const { POST } = await import("@/app/api/auth/change-password/route");
  return POST(new Request("http://local/api/auth/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) }));
};

// Password hashing is deliberately slow; under the full parallel run 5s is not enough.
describe("POST /api/auth/change-password", { timeout: 20000 }, () => {
  beforeEach(() => { saved.length = 0; });

  it("accepts the right current password stored as argon2id (after a sign-in)", async () => {
    account.passwordHash = await hashPassword("Old-Password-123");
    const res = await call("Old-Password-123", "New-Password-4567");
    expect(res.status).toBe(200);
    expect(saved).toHaveLength(1);
    expect(saved[0].startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("New-Password-4567", saved[0])).toBe(true);
  });

  it("still accepts an older bcrypt hash", async () => {
    account.passwordHash = await bcrypt.hash("Old-Password-123", 4);
    expect((await call("Old-Password-123", "New-Password-4567")).status).toBe(200);
  });

  it("rejects a wrong current password", async () => {
    account.passwordHash = await hashPassword("Old-Password-123");
    const res = await call("not-the-password", "New-Password-4567");
    expect(res.status).toBe(400);
    expect(saved).toHaveLength(0);
  });
});
