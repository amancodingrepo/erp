import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAuthSecret } from "./secrets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireAuthSecret", () => {
  it("falls back in development when AUTH_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "");
    expect(requireAuthSecret()).toBe("dev-only-not-for-production");
  });

  it("returns a provided secret in development even if short", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "short");
    expect(requireAuthSecret()).toBe("short");
  });

  it("throws in production when AUTH_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => requireAuthSecret()).toThrow(
      /AUTH_SECRET must be >= 32 chars in production/,
    );
  });

  it("throws in production when AUTH_SECRET is shorter than 32 chars", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "too-short-to-be-secure");
    expect(() => requireAuthSecret()).toThrow(
      /AUTH_SECRET must be >= 32 chars in production/,
    );
  });

  it("throws in production when AUTH_SECRET is the literal changeme", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "changeme");
    expect(() => requireAuthSecret()).toThrow(
      /AUTH_SECRET must be >= 32 chars in production/,
    );
  });

  it("throws in production when AUTH_SECRET is the example placeholder", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "changeme-generate-a-long-random-string");
    expect(() => requireAuthSecret()).toThrow(
      /AUTH_SECRET must be >= 32 chars in production/,
    );
  });

  it("returns a strong secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const secret = "a".repeat(32);
    vi.stubEnv("AUTH_SECRET", secret);
    expect(requireAuthSecret()).toBe(secret);
  });
});
