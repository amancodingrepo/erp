import { describe, expect, it } from "vitest";
import { backupDir } from "./db-backup";

describe("db backup paths", () => {
  it("keeps dumps under the uploads root", () => {
    expect(backupDir().replace(/\\/g, "/")).toMatch(/backups$/);
  });
});
