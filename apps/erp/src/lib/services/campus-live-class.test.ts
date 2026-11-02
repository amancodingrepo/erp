import { LiveClassProvider } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { liveClassPatchData } from "./campus-live-class";

const existing = {
  title: "Maths",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  recordingUrl: "https://youtu.be/xxxx",
  startsAt: new Date("2026-10-12T09:00:00.000Z"),
  provider: LiveClassProvider.GMEET,
};

describe("live class patches", () => {
  it("maps title and Meet URL and rejects bad urls", () => {
    expect(liveClassPatchData(existing, { title: " Algebra " }).title).toBe("Algebra");
    expect(
      liveClassPatchData(existing, { meetingUrl: "https://us02web.zoom.us/j/123" }).meetingUrl,
    ).toContain("zoom.us");
    expect(liveClassPatchData(existing, { recordingUrl: "" }).recordingUrl).toBeNull();
    expect(() => liveClassPatchData(existing, { title: " " })).toThrow();
    expect(() =>
      liveClassPatchData(existing, { meetingUrl: "https://evil.example/phish" }),
    ).toThrow();
    expect(() => liveClassPatchData(existing, { startsAt: "not-a-date" })).toThrow();
  });
});
