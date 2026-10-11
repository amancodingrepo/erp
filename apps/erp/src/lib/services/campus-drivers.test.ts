import { describe, expect, it } from "vitest";
import {
  driverAssignedToVehicle,
  dropDriverExtra,
  isDriverExtra,
  parseDriverWrite,
} from "./campus-drivers";

describe("drivers", () => {
  it("treats license or driver category as a driver extra", () => {
    expect(isDriverExtra({ category: "Driver", licenseNo: "" })).toBe(true);
    expect(isDriverExtra({ category: "PGT", licenseNo: "DL-1" })).toBe(true);
    expect(isDriverExtra({ category: "PGT", licenseNo: "" })).toBe(false);
    expect(isDriverExtra(null)).toBe(false);
  });

  it("requires employee id, name, and license", () => {
    expect(
      parseDriverWrite({
        employeeId: "D-1",
        firstName: "Ravi",
        licenseNo: "DL-99",
        phone: "999",
      }),
    ).toEqual({
      employeeId: "D-1",
      firstName: "Ravi",
      lastName: undefined,
      phone: "999",
      email: undefined,
      username: undefined,
      licenseNo: "DL-99",
      licenseExpiry: undefined,
    });
    expect(() => parseDriverWrite({ firstName: "Ravi", licenseNo: "DL-1" })).toThrow();
    expect(() =>
      parseDriverWrite({ employeeId: "D-1", firstName: "Ravi" }),
    ).toThrow();
  });

  it("clears driver extras and flags assigned vehicles", () => {
    const extras = [
      {
        staffId: "st1",
        category: "Driver",
        licenseNo: "DL-99",
        licenseExpiry: "2027-01-01",
        dob: "",
      },
      {
        staffId: "st2",
        category: "PGT",
        licenseNo: "DL-1",
        licenseExpiry: "",
        dob: "",
      },
    ];
    const dropped = dropDriverExtra(extras, "st1");
    expect(isDriverExtra(dropped.find((row) => row.staffId === "st1")!)).toBe(
      false,
    );
    expect(isDriverExtra(dropped.find((row) => row.staffId === "st2")!)).toBe(
      true,
    );
    expect(
      driverAssignedToVehicle(
        [{ driverId: "st1" }, { driverId: "" }],
        "st1",
      ),
    ).toBe(true);
    expect(driverAssignedToVehicle([{ driverId: "st2" }], "st1")).toBe(false);
  });
});
