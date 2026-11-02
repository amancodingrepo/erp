import { describe, expect, it } from "vitest";
import { liveMeetingUrl, liveRecordingUrl } from "./live-class-url";

describe("live class URL", () => {
  it("allows https Meet/Zoom and rejects javascript or other hosts", () => {
    expect(liveMeetingUrl("https://meet.google.com/abc-defg-hij")).toContain(
      "meet.google.com",
    );
    expect(liveMeetingUrl("https://us02web.zoom.us/j/123")).toContain("zoom.us");
    expect(liveMeetingUrl("javascript:alert(1)")).toBeNull();
    expect(liveMeetingUrl("http://meet.google.com/abc")).toBeNull();
    expect(liveMeetingUrl("https://evil.example/phish")).toBeNull();
    expect(liveRecordingUrl("https://youtu.be/xxxx")).toContain("youtu.be");
  });
});
