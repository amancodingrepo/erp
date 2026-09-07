import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as hostelPost } from "@/app/api/v1/hostels/route";
import { POST as roomPost } from "@/app/api/v1/hostels/rooms/route";
import { POST as allocatePost } from "@/app/api/v1/hostels/allocate/route";
import { POST as routePost } from "@/app/api/v1/transport/routes/route";
import { POST as assignPost } from "@/app/api/v1/transport/assign/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `ht-${Date.now()}`;

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

describe("Phase B hostel and transport fee heads", () => {
  let token: string;
  let campusId: string;
  let studentA: string;
  let studentB: string;
  let roomId: string;
  let routeId: string;
  let pickupId: string;

  beforeAll(async () => {
    const loginRes = await loginPost(
      req("x", { username: "admin", password: SEED_PASSWORD, portal: "staff" }),
    );
    const body = (await loginRes.json()) as { token?: string };
    if (!body.token) throw new Error("login failed");
    token = body.token;
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus?.currentSessionId) throw new Error("seed campus missing");
    campusId = campus.id;
    const a = await prisma.student.create({
      data: { campusId, admissionNo: `HA-${suffix}`, firstName: "Hari" },
    });
    const b = await prisma.student.create({
      data: { campusId, admissionNo: `HB-${suffix}`, firstName: "Bina" },
    });
    studentA = a.id;
    studentB = b.id;
  });

  it("allocates a room, posts Hostel fee, and rejects a full room", async () => {
    const hostel = await hostelPost(
      req(token, { name: `Block ${suffix}`, feeAmount: 12000 }),
    );
    expect(hostel.status).toBe(201);
    const hostelBody = (await hostel.json()) as { id: string };
    const room = await roomPost(
      req(token, {
        hostelId: hostelBody.id,
        number: "101",
        capacity: 1,
        roomType: "1-share",
      }),
    );
    expect(room.status).toBe(201);
    roomId = ((await room.json()) as { id: string }).id;
    const first = await allocatePost(
      req(token, { studentId: studentA, roomId }),
    );
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { invoiceId: string | null };
    expect(firstBody.invoiceId).toBeTruthy();
    const line = await prisma.feeInvoiceLine.findFirst({
      where: { invoiceId: firstBody.invoiceId!, description: { contains: "Hostel" } },
    });
    expect(Number(line?.amount)).toBe(12000);
    const full = await allocatePost(
      req(token, { studentId: studentB, roomId }),
    );
    expect(full.status).toBe(422);
  });

  it("assigns transport pickup and posts Transport fee once", async () => {
    const route = await routePost(
      req(token, {
        name: `City ${suffix}`,
        feeAmount: 3000,
        pickups: ["Square", "Gate"],
      }),
    );
    expect(route.status).toBe(201);
    const body = (await route.json()) as {
      id: string;
      pickups: Array<{ id: string; name: string }>;
    };
    routeId = body.id;
    pickupId = body.pickups[0].id;
    const assigned = await assignPost(
      req(token, {
        studentId: studentA,
        routeId,
        pickupPointId: pickupId,
      }),
    );
    expect(assigned.status).toBe(201);
    const json = (await assigned.json()) as { invoiceId: string | null };
    expect(json.invoiceId).toBeTruthy();
    const again = await assignPost(
      req(token, {
        studentId: studentA,
        routeId,
        pickupPointId: pickupId,
      }),
    );
    expect(again.status).toBe(201);
    const againBody = (await again.json()) as { invoiceId: string | null };
    expect(againBody.invoiceId).toBeNull();
  });
});
