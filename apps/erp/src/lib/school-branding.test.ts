import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, parseLogoDataUrl } from "./school-branding";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const url = (mime: string, bytes: Buffer) => "data:" + mime + ";base64," + bytes.toString("base64");
const reason = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as Error).message; } return "accepted"; };

describe("parseLogoDataUrl", () => {
  it("accepts real PNG, JPEG and WebP images", () => {
    expect(parseLogoDataUrl(url("image/png", png)).mime).toBe("image/png");
    expect(parseLogoDataUrl(url("image/jpeg", jpeg)).bytes.length).toBe(jpeg.length);
    expect(parseLogoDataUrl(url("image/webp", webp)).mime).toBe("image/webp");
  });
  it("refuses SVG, which can carry script on this origin", () => {
    expect(reason(() => parseLogoDataUrl(url("image/svg+xml", Buffer.from("<svg onload=alert(1)>"))))).toMatch(/PNG, JPEG or WebP/);
  });
  it("refuses a file whose bytes do not match its claimed type", () => {
    expect(reason(() => parseLogoDataUrl(url("image/png", Buffer.from("<html>not a png</html>"))))).toMatch(/does not match/);
  });
  it("refuses empty, non-data-URL and oversized logos", () => {
    expect(reason(() => parseLogoDataUrl("https://example.com/logo.png"))).toMatch(/uploaded/);
    expect(reason(() => parseLogoDataUrl("data:image/png;base64,"))).not.toBe("accepted");
    const big = Buffer.concat([png, Buffer.alloc(LOGO_MAX_BYTES)]);
    expect(reason(() => parseLogoDataUrl(url("image/png", big)))).toMatch(/1 MB/);
  });
});
