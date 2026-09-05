import { describe, expect, it } from "vitest";
import { NAV, NAV_ITEM_COUNT } from "./nav";
import { SCREEN_COUNT, SCREENS } from "./screens";
import { allHrefs } from "./lookup";

describe("ERP screen catalog", () => {
  it("loads every screen from screens.csv", () => {
    expect(SCREEN_COUNT).toBe(335);
    expect(SCREENS[0].href).toBe("/staff/dashboard");
  });

  it("loads the live sidebar groups", () => {
    expect(NAV.length).toBe(42);
    expect(NAV_ITEM_COUNT).toBeGreaterThanOrEqual(320);
  });

  it("has unique screen routes", () => {
    const routes = SCREENS.map((s) => s.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("covers sidebar destinations plus csv screens", () => {
    expect(allHrefs().length).toBeGreaterThanOrEqual(335);
  });
});
