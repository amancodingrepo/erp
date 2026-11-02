import { describe, expect, it } from "vitest";
import { backupDir, safeDumpName } from "./db-backup";

describe("db backup paths", () => {
  it("keeps dumps under the uploads root", () => {
    expect(backupDir().replace(/\\/g, "/")).toMatch(/backups$/);
  });

  it("rejects path traversal in dump names", () => {
    expect(() => safeDumpName("../etc/passwd")).toThrow(/invalid dump name/);
    expect(() => safeDumpName("erp-ok.dump")).not.toThrow();
  });
});
