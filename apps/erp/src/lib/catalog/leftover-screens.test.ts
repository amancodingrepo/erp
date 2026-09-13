import { describe, expect, it } from "vitest";
import { LEFTOVER_LIVE } from "@/components/modules/leftover-screens";

describe("leftover catalog wiring", () => {
  it("wires leftover staff hrefs including updater", () => {
    expect(Object.keys(LEFTOVER_LIVE).length).toBeGreaterThan(90);
    expect(LEFTOVER_LIVE["/staff/updater"]).toBeTypeOf("function");
    expect(LEFTOVER_LIVE["/staff/student/bulkdelete"]).toBeTypeOf("function");
    expect(LEFTOVER_LIVE["/staff/customfield"]).toBeTypeOf("function");
  });
});
