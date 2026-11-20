import { describe, expect, it } from "vitest";
import { combineModuleFlags, defaultOrgModules, parseOrgModulePatch, parseOrgModules } from "./org-modules";

describe("organisation modules", () => {
  it("keeps every module on until a flag is stored", () => {
    expect(parseOrgModules(undefined).fees).toBe(true);
    expect(parseOrgModules({ fees: false }).fees).toBe(false);
    expect(parseOrgModules({ fees: false }).attendance).toBe(true);
    expect(defaultOrgModules().students).toBe(true);
  });

  it("accepts only known boolean flags", () => {
    expect(parseOrgModulePatch({ fees: false })).toEqual({ fees: false });
    expect(() => parseOrgModulePatch({ billing: true })).toThrow();
    expect(() => parseOrgModulePatch({ fees: "no" })).toThrow();
  });

  it("turns a module off when either the platform or the organisation switch is off", () => {
    const on = defaultOrgModules();
    const orgOff = { ...on, fees: false };
    const platformOff = { ...on, attendance: false };
    expect(combineModuleFlags(orgOff, on).fees).toBe(false);
    expect(combineModuleFlags(orgOff, on).attendance).toBe(true);
    expect(combineModuleFlags(on, platformOff).attendance).toBe(false);
    expect(combineModuleFlags(on, platformOff).fees).toBe(true);
    expect(combineModuleFlags(on, on, { ...on, store: false }).store).toBe(false);
    expect(combineModuleFlags(on, on, { ...on, store: false }).fees).toBe(true);
  });
});
