import { describe, expect, it } from "vitest";
import {
  customFieldPatch,
  normalizeBelongTo,
  normalizeFieldType,
} from "./campus-custom-fields";

describe("custom fields", () => {
  it("normalizes belongTo and type on a live field patch", () => {
    expect(normalizeBelongTo("student")).toBe("Student");
    expect(normalizeBelongTo("liberal art")).toBe("Liberal Art");
    expect(normalizeFieldType("select")).toBe("Dropdown");
    expect(normalizeFieldType("text")).toBe("Input");
    expect(
      customFieldPatch({ name: " House ", required: true, visible: false }),
    ).toMatchObject({ name: "House", required: true, visible: false });
    expect(() => normalizeBelongTo("widget")).toThrow();
    expect(() => normalizeFieldType("color")).toThrow();
    expect(() => customFieldPatch({ name: " " })).toThrow();
  });
});
