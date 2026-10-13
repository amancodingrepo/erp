import { describe, expect, it } from "vitest";
import { conflict, uniqueConstraintHits } from "./errors";
import { fail } from "./http";

describe("fail", () => {
  it("maps Prisma unique violations to 409 even without instanceof", async () => {
    const res = fail({ code: "P2002", meta: { target: ["admissionNo"] } });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("conflict");
  });

  it("detects receiptNo unique collisions from Prisma meta", () => {
    expect(
      uniqueConstraintHits({ code: "P2002", meta: { target: ["receiptNo"] } }, "receiptNo"),
    ).toBe(true);
    expect(
      uniqueConstraintHits({ code: "P2002", meta: { target: ["idempotencyKey"] } }, "receiptNo"),
    ).toBe(false);
  });

  it("keeps HttpError conflict as 409", async () => {
    const res = fail(conflict("duplicate admissionNo"));
    expect(res.status).toBe(409);
  });
});
