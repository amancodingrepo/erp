import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as bookPost } from "@/app/api/v1/library/books/route";
import { POST as memberPost } from "@/app/api/v1/library/members/route";
import { POST as issuePost } from "@/app/api/v1/library/issues/route";
import { POST as returnPost } from "@/app/api/v1/library/issues/[id]/return/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `lib-${Date.now()}`;

function req(token: string, payload: unknown) {
  return new Request("http://local/api", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("Phase B library", () => {
  let token: string;
  let campusId: string;
  let studentId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
    const student = await prisma.student.create({
      data: { campusId, admissionNo: `LIB-${suffix}`, firstName: "Lila" },
    });
    studentId = student.id;
  });

  it("refuses a second issue when qty is 1 and fines a late return", async () => {
    const book = await bookPost(
      req(token, { title: `Physics ${suffix}`, qty: 1, price: 200 }),
    );
    expect(book.status).toBe(201);
    const bookId = ((await book.json()) as { id: string }).id;
    const member = await memberPost(req(token, { studentId }));
    expect(member.status).toBe(201);
    const memberId = ((await member.json()) as { id: string }).id;
    const first = await issuePost(req(token, { bookId, memberId }));
    expect(first.status).toBe(201);
    const issueId = ((await first.json()) as { id: string }).id;
    const second = await issuePost(req(token, { bookId, memberId }));
    expect(second.status).toBe(422);
    await prisma.bookIssue.update({
      where: { id: issueId },
      data: { dueOn: new Date("2020-01-01T00:00:00.000Z") },
    });
    const ret = await returnPost(
      new Request("http://local/api", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      }),
      { params: Promise.resolve({ id: issueId }) },
    );
    expect(ret.status).toBe(200);
    const body = (await ret.json()) as { fine: string };
    expect(Number(body.fine)).toBeGreaterThan(0);
  });
});
