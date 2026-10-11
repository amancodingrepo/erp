import { beforeAll, describe, expect, it } from "vitest";
import { POST as loginPost } from "@/app/api/v1/auth/login/route";
import { POST as noticesPost } from "@/app/api/v1/notices/route";
import { POST as routePost } from "@/app/api/v1/transport/routes/route";
import { POST as assignPost } from "@/app/api/v1/transport/assign/route";
import { GET as studentGet } from "@/app/api/v1/students/[id]/route";
import { PUT as daycarePut } from "@/app/api/v1/students/[id]/daycare/route";
import { POST as immunizePost } from "@/app/api/v1/students/[id]/immunizations/route";
import {
  GET as requestsGet,
  POST as requestsPost,
} from "@/app/api/v1/requests/route";
import { POST as requestReadPost } from "@/app/api/v1/requests/[id]/read/route";
import { POST as noticeReadPost } from "@/app/api/v1/notices/[id]/read/route";
import { GET as noticeReceiptsGet } from "@/app/api/v1/notices/[id]/receipts/route";
import { prisma } from "@/lib/db";

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
const suffix = `diary-${Date.now()}`;

function req(method: string, path: string, token: string, payload?: unknown) {
  return new Request(`http://local${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(payload !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });
}

async function login(username: string, portal: string) {
  const res = await loginPost(
    req("POST", "/api/v1/auth/login", "x", {
      username,
      password: SEED_PASSWORD,
      portal,
    }),
  );
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error(`login failed ${username}`);
  return body.token;
}

describe("School Diary parent engagement", () => {
  let adminToken: string;
  let parentToken: string;
  let campusId: string;
  let studentId: string;
  let inRouteId: string;
  let inPickupId: string;
  let outRouteId: string;
  let outPickupId: string;

  beforeAll(async () => {
    adminToken = await login("admin", "staff");
    parentToken = await login("parent1", "parent");
    const campus = await prisma.campus.findFirst({ where: { code: "MAIN" } });
    if (!campus) throw new Error("seed campus missing");
    campusId = campus.id;
    const student = await prisma.student.findFirst({
      where: { campusId, admissionNo: "STU-001" },
    });
    if (!student) throw new Error("seed student missing");
    studentId = student.id;
  });

  it("assigns inbound and outbound transport stops on the student profile", async () => {
    const inRoute = await routePost(
      req("POST", "/api/v1/transport/routes", adminToken, {
        name: `In ${suffix}`,
        feeAmount: 800,
        pickups: ["Gate A"],
      }),
    );
    expect(inRoute.status).toBe(201);
    const inBody = (await inRoute.json()) as {
      id: string;
      pickups: Array<{ id: string }>;
    };
    inRouteId = inBody.id;
    inPickupId = inBody.pickups[0].id;

    const outRoute = await routePost(
      req("POST", "/api/v1/transport/routes", adminToken, {
        name: `Out ${suffix}`,
        feeAmount: 0,
        pickups: ["Gate B"],
      }),
    );
    expect(outRoute.status).toBe(201);
    const outBody = (await outRoute.json()) as {
      id: string;
      pickups: Array<{ id: string }>;
    };
    outRouteId = outBody.id;
    outPickupId = outBody.pickups[0].id;

    const assigned = await assignPost(
      req("POST", "/api/v1/transport/assign", adminToken, {
        studentId,
        routeId: inRouteId,
        pickupPointId: inPickupId,
        outRouteId,
        outPickupPointId: outPickupId,
      }),
    );
    expect(assigned.status).toBe(201);

    const profile = await studentGet(
      req("GET", `/api/v1/students/${studentId}`, adminToken),
      { params: Promise.resolve({ id: studentId }) },
    );
    expect(profile.status).toBe(200);
    const json = (await profile.json()) as {
      transport: {
        inStop: string;
        outStop: string;
      };
      feeLedger: { totalFees: string; installments: unknown[] };
    };
    expect(json.transport.inStop).toBe("Gate A");
    expect(json.transport.outStop).toBe("Gate B");
    expect(json.feeLedger.installments).toBeInstanceOf(Array);
  });

  it("saves daycare and immunization on the student profile", async () => {
    const daycare = await daycarePut(
      req("PUT", `/api/v1/students/${studentId}/daycare`, adminToken, {
        enrolled: true,
        checkIn: "08:00",
        checkOut: "16:30",
        allowCctv: true,
      }),
      { params: Promise.resolve({ id: studentId }) },
    );
    expect(daycare.status).toBe(200);
    const dayJson = (await daycare.json()) as { enrolled: boolean; allowCctv: boolean };
    expect(dayJson.enrolled).toBe(true);
    expect(dayJson.allowCctv).toBe(true);

    const shot = await immunizePost(
      req("POST", `/api/v1/students/${studentId}/immunizations`, adminToken, {
        vaccineName: "MMR",
        scheduleDate: "2026-04-01",
        status: "SCHEDULED",
        remarks: "clinic",
      }),
      { params: Promise.resolve({ id: studentId }) },
    );
    expect(shot.status).toBe(201);
    const shotJson = (await shot.json()) as { vaccineName: string; status: string };
    expect(shotJson.vaccineName).toBe("MMR");
    expect(shotJson.status).toBe("SCHEDULED");
  });

  it("hides scheduled parent requests until deliver time, then records a read", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const scheduled = await requestsPost(
      req("POST", "/api/v1/requests", adminToken, {
        studentId,
        body: `PTM reminder ${suffix}`,
        category: "Academics",
        scheduledAt: future,
      }),
    );
    expect(scheduled.status).toBe(201);
    const scheduledJson = (await scheduled.json()) as { id: string; deliveredAt: string | null };
    expect(scheduledJson.deliveredAt).toBeNull();

    const parentInbox = await requestsGet(
      req("GET", "/api/v1/requests?folder=inbox", parentToken),
    );
    expect(parentInbox.status).toBe(200);
    const inboxJson = (await parentInbox.json()) as { data: Array<{ body: string }> };
    expect(inboxJson.data.some((row) => row.body.includes(suffix))).toBe(false);

    const staffScheduled = await requestsGet(
      req("GET", "/api/v1/requests?folder=scheduled", adminToken),
    );
    expect(staffScheduled.status).toBe(200);
    const schedFolder = (await staffScheduled.json()) as { data: Array<{ id: string }> };
    expect(schedFolder.data.some((row) => row.id === scheduledJson.id)).toBe(true);

    const nowMsg = await requestsPost(
      req("POST", "/api/v1/requests", adminToken, {
        studentId,
        body: `Fees note ${suffix}`,
        category: "Fees",
      }),
    );
    expect(nowMsg.status).toBe(201);
    const nowJson = (await nowMsg.json()) as { id: string };

    const inboxAfter = await requestsGet(
      req("GET", "/api/v1/requests?folder=inbox", parentToken),
    );
    const afterJson = (await inboxAfter.json()) as {
      data: Array<{ id: string; unread: boolean }>;
    };
    const found = afterJson.data.find((row) => row.id === nowJson.id);
    expect(found?.unread).toBe(true);

    const read = await requestReadPost(
      req("POST", `/api/v1/requests/${nowJson.id}/read`, parentToken),
      { params: Promise.resolve({ id: nowJson.id }) },
    );
    expect(read.status).toBe(200);

    const unseen = await requestsGet(
      req("GET", "/api/v1/requests?folder=unseen", parentToken),
    );
    const unseenJson = (await unseen.json()) as { data: Array<{ id: string }> };
    expect(unseenJson.data.some((row) => row.id === nowJson.id)).toBe(false);
  });

  it("records notice read receipts for parents", async () => {
    const notice = await noticesPost(
      req("POST", "/api/v1/notices", adminToken, {
        title: `Holiday ${suffix}`,
        body: "School closed Friday",
        audience: "all",
        isPublished: true,
      }),
    );
    expect(notice.status).toBe(201);
    const noticeJson = (await notice.json()) as { id: string };

    const mark = await noticeReadPost(
      req("POST", `/api/v1/notices/${noticeJson.id}/read`, parentToken),
      { params: Promise.resolve({ id: noticeJson.id }) },
    );
    expect(mark.status).toBe(200);

    const receipts = await noticeReceiptsGet(
      req("GET", `/api/v1/notices/${noticeJson.id}/receipts`, adminToken),
      { params: Promise.resolve({ id: noticeJson.id }) },
    );
    expect(receipts.status).toBe(200);
    const recJson = (await receipts.json()) as { readCount: number };
    expect(recJson.readCount).toBeGreaterThanOrEqual(1);
  });
});
