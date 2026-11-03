import { describe, expect, it } from "vitest";
import { PERMISSION_CATALOG } from "@/lib/permission-catalog";
import {
  REGISTER_BY_KIND,
  REGISTER_KINDS,
  isRegisterScreenKey,
  parseRegisterPayload,
  parseRegisterStatus,
  publicRegisterKinds,
  registerKind,
  registerTitle,
} from "./registers";

const def = (kind: string) => REGISTER_BY_KIND.get(kind)!;
const fieldsOf = (fn: () => unknown) => {
  try { fn(); } catch (error) { return (error as { fields?: Record<string, string> }).fields; }
  throw new Error("expected a validation error");
};

describe("register definitions", () => {
  it("are unique and internally consistent", () => {
    const kinds = REGISTER_KINDS.map((k) => k.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const k of REGISTER_KINDS) {
      const keys = k.fields.map((f) => f.key);
      expect(new Set(keys).size, k.kind).toBe(keys.length);
      expect(keys, k.kind).toContain(k.titleField);
      for (const [a, b] of k.ordered || []) { expect(keys).toContain(a); expect(keys).toContain(b); }
      for (const f of k.fields) {
        if (f.type === "enum") expect(f.options?.length, f.key).toBeGreaterThan(0);
        if (f.type === "register") expect(REGISTER_BY_KIND.has(f.ref || ""), f.key).toBe(true);
        expect(["status", "id", "createdAt", "updatedAt", ...(k.codePrefix ? ["code"] : [])]).not.toContain(f.key);
        if (f.key === "title") expect(k.titleField, k.kind).toBe("title");
      }
    }
  });
  it("only use permissions that roles can be granted", () => {
    const known = new Set(PERMISSION_CATALOG.map((p) => [p.module, p.feature, p.action].join(".")));
    for (const k of REGISTER_KINDS) for (const perm of [k.view, k.write]) expect(known.has(perm.join(".")), k.kind + " " + perm.join(".")).toBe(true);
  });
  it("rejects unknown kinds", () => {
    expect(fieldsOf(() => registerKind("nope"))).toEqual({ kind: "unknown register" });
  });
  it("public definitions carry no permissions", () => {
    expect(JSON.stringify(publicRegisterKinds())).not.toMatch(/"view"|"write"/);
  });
});

describe("parseRegisterPayload", () => {
  it("requires required fields and drops unknown keys", () => {
    expect(fieldsOf(() => parseRegisterPayload(def("phone-calls"), { name: " " }))).toMatchObject({ name: expect.any(String), direction: expect.any(String), date: expect.any(String) });
    const { payload } = parseRegisterPayload(def("phone-calls"), { name: "A", direction: "Incoming", date: "2026-01-02", campusId: "x" });
    expect(payload).toEqual({ name: "A", direction: "Incoming", date: "2026-01-02" });
  });
  it("checks types, enums, ranges and order", () => {
    const f = fieldsOf(() => parseRegisterPayload(def("teacher-ratings"), { staffId: "s", period: "T1", rating: 9 }));
    expect(f?.rating).toMatch(/at most 5/);
    expect(fieldsOf(() => parseRegisterPayload(def("phone-calls"), { name: "A", direction: "Sideways", date: "2026-01-02" }))?.direction).toMatch(/one of/);
    expect(fieldsOf(() => parseRegisterPayload(def("phone-calls"), { name: "A", direction: "Incoming", date: "02/01/2026" }))?.date).toMatch(/date/);
    expect(fieldsOf(() => parseRegisterPayload(def("marks-divisions"), { name: "First", minPct: 60, maxPct: 40 }))?.maxPct).toMatch(/must not be less than/);
    expect(fieldsOf(() => parseRegisterPayload(def("staff-leave-batches"), { name: "Y", fromDate: "2026-04-01", toDate: "2026-03-01" }))?.toDate).toMatch(/must not be before/);
    expect(fieldsOf(() => parseRegisterPayload(def("teacher-research"), { staffId: "s", category: "Award", title: "x", link: "javascript:alert(1)" }))?.link).toMatch(/http/);
  });
  it("turns numeric strings into numbers and lists references", () => {
    const { payload, refs } = parseRegisterPayload(def("remuneration-hours"), { staffId: "st1", role: "Examiner", quantity: "12.5" });
    expect(payload.quantity).toBe(12.5);
    expect(refs).toEqual([{ type: "staff", id: "st1", ref: undefined, key: "staffId" }]);
    const sem = parseRegisterPayload(def("semester-allocations"), { semesterId: "r1", classId: "c1" });
    expect(sem.refs.map((r) => r.ref ?? r.type)).toEqual(["semesters", "class"]);
  });
  it("partial edits only check given keys but may not blank required ones", () => {
    expect(parseRegisterPayload(def("phone-calls"), { note: "hi" }, true).payload).toEqual({ note: "hi" });
    expect(fieldsOf(() => parseRegisterPayload(def("phone-calls"), { name: "" }, true))?.name).toMatch(/required/);
    expect(parseRegisterPayload(def("phone-calls"), { note: "" }, true).payload).toEqual({ note: null });
  });
});

describe("status and title", () => {
  it("only accepts declared statuses", () => {
    expect(parseRegisterStatus(def("complaints"), "Resolved")).toBe("Resolved");
    expect(fieldsOf(() => parseRegisterStatus(def("complaints"), "Lost"))?.status).toMatch(/one of/);
    expect(fieldsOf(() => parseRegisterStatus(def("phone-calls"), "Open"))?.status).toMatch(/no status/);
  });
  it("titles fall back to the register name", () => {
    expect(registerTitle(def("postal-dispatch"), { toTitle: "Board office" })).toBe("Board office");
    expect(registerTitle(def("semester-allocations"), { note: null })).toBe("Semester allocation");
  });
  it("recognises the reserved screen key prefix", () => {
    expect(isRegisterScreenKey(" Register:complaints")).toBe(true);
    expect(isRegisterScreenKey("/staff/front-office")).toBe(false);
  });
});
