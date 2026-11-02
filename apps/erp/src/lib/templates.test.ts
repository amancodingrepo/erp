import { describe, expect, it } from "vitest";
import { renderTemplate } from "./templates";

describe("message templates", () => {
  it("replaces placeholders and blanks missing keys", () => {
    expect(
      renderTemplate("Dear {{ name }}, balance {{ balance }}", {
        name: "Anika",
        balance: "1200.00",
      }),
    ).toBe("Dear Anika, balance 1200.00");
    expect(renderTemplate("Hi {{ missing }}", {})).toBe("Hi ");
  });
});
