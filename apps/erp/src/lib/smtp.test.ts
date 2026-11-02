import { describe, expect, it } from "vitest";
import { loadSmtpConfig } from "./smtp";

describe("smtp", () => {
  it("uses SMTP_HOST from the environment when set", async () => {
    const prev = process.env.SMTP_HOST;
    process.env.SMTP_HOST = "smtp.example.test";
    const cfg = await loadSmtpConfig();
    expect(cfg?.host).toBe("smtp.example.test");
    if (prev === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = prev;
  });
});
