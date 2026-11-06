import { describe, expect, it } from "vitest";
import { schoolWorldUser } from "./school-world-shape";

// The signed-in user carries the school's own timezone, currency and date format, so School World
// formats money and dates per school. Before, sign-in sent no timezone and every school got India time.
const principal = { id: "u1", campusId: "c1", actorType: "STAFF", roles: ["Principal"], permissions: [] } as never;
const account = { email: "p@x", username: "p", firstName: "P", lastName: "Q", mustChangePassword: false, phone: null };

describe("schoolWorldUser locale", () => {
  it("passes the campus's own settings through", () => {
    const user = schoolWorldUser(principal, account, {
      id: "c1", name: "Dubai Campus", code: "DXB", timezone: "Asia/Dubai",
      currencyCode: "AED", currencyFormat: "AED", currencyPlace: "after", dateFormat: "MM/DD/YYYY", startMonth: 9,
    });
    expect(user.school.timezone).toBe("Asia/Dubai");
    expect(user.school.locale).toEqual({ currencyCode: "AED", currencySymbol: "AED", currencyPlace: "after", dateFormat: "MM/DD/YYYY", startMonth: 9 });
  });

  it("fills in the platform defaults only where a campus has none", () => {
    const user = schoolWorldUser(principal, account, { id: "c1", name: "Main", code: null });
    expect(user.school.locale).toEqual({ currencyCode: "INR", currencySymbol: "", currencyPlace: "before", dateFormat: "DD/MM/YYYY", startMonth: null });
  });
});
