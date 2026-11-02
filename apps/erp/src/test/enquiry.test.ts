import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as enquiryPost } from "@/app/api/v1/enquiries/route";
import { PATCH as enquiryPatch } from "@/app/api/v1/enquiries/[id]/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

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

describe("Phase B enquiry CRM", () => {
  let token: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
  });

  it("converts a won enquiry into an unpaid application", async () => {
    const created = await enquiryPost(
      req(token, {
        name: "Ravi Kumar",
        phone: "9000000022",
        source: "Walk-in",
        classInterested: "FY BA",
      }),
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const converted = await enquiryPatch(
      new Request("http://local/api", {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ convert: true }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(converted.status).toBe(200);
    const body = (await converted.json()) as { applicationNo: string };
    expect(body.applicationNo).toMatch(/^APP-/);
    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    expect(enquiry?.status).toBe("WON");
    const app = await prisma.application.findFirst({
      where: { applicationNo: body.applicationNo },
    });
    expect(app?.paymentStatus).toBe("UNPAID");
    expect(app?.firstName).toBe("Ravi");
  });
});
