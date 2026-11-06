import { beforeEach, describe, expect, it, vi } from "vitest";

// Printed pages (fee receipts, letterheads, payslips) use the school's own logo, never a built-in one.
const mocks = vi.hoisted(() => ({ settings: new Map<string, unknown>(), campus: { id: "c1", name: "Green Valley", address: "1 Road" } }));

vi.mock("@/lib/db", () => ({
  prisma: {
    setting: {
      findUnique: async ({ where }: { where: { campusId_key: { campusId: string; key: string } } }) => {
        const value = mocks.settings.get(`${where.campusId_key.campusId}:${where.campusId_key.key}`);
        return value === undefined ? null : { value };
      },
      findMany: async ({ where }: { where: { campusId: string; key: { in: string[] } } }) =>
        where.key.in
          .map((key) => ({ key, value: mocks.settings.get(`${where.campusId}:${key}`) }))
          .filter((row) => row.value !== undefined),
    },
    campus: { findUnique: async () => mocks.campus },
  },
}));

const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]).toString("base64");

describe("school logo on printed pages", () => {
  beforeEach(() => mocks.settings.clear());

  it("letterheads use the school's uploaded logo", async () => {
    mocks.settings.set("c1:school-world-config", { logoDataUrl: png });
    const { campusLetterhead } = await import("./letterhead");
    expect((await campusLetterhead("c1")).logo).toBe(png);
  });

  it("an older print-only logo still wins when a school set one", async () => {
    mocks.settings.set("c1:school-world-config", { logoDataUrl: png });
    mocks.settings.set("c1:campus.logo", "https://cdn.example/print-logo.png");
    const { campusLetterhead } = await import("./letterhead");
    expect((await campusLetterhead("c1")).logo).toBe("https://cdn.example/print-logo.png");
  });

  it("no logo uploaded means no logo, not a placeholder", async () => {
    const { campusLetterhead } = await import("./letterhead");
    const { schoolLogoDataUrl } = await import("./school-branding");
    expect((await campusLetterhead("c1")).logo).toBe("");
    expect(await schoolLogoDataUrl("c1")).toBe("");
  });

  it("a stored value that isn't a valid image is not printed", async () => {
    mocks.settings.set("c1:school-world-config", { logoDataUrl: "data:image/svg+xml;base64,PHN2Zz4=" });
    const { schoolLogoDataUrl } = await import("./school-branding");
    expect(await schoolLogoDataUrl("c1")).toBe("");
  });
});
