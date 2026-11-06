import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  currencyCode, currencySymbol, formatDate, formatMoney, formatMoneyCode, formatNumber, moneyLabel,
  schoolLocale, schoolToday,
} from "../src/school-locale.js";

// Money, numbers and dates follow the signed-in school's Campus settings, not a fixed ₹ / en-IN /
// Asia/Kolkata. See docs/school-world-hardcoded-values.md (section 4).

function asSchool(locale, timezone, fn) {
  const previous = globalThis.window;
  globalThis.window = { SCHOOL_DIARY_CONFIG: { schoolLocale: locale, schoolTimezone: timezone } };
  try { return fn(); } finally { globalThis.window = previous; }
}

test("an Indian school keeps rupees, lakh grouping and DD/MM/YYYY", () => {
  asSchool({ currencyCode: "INR", currencySymbol: "₹", currencyPlace: "before", dateFormat: "DD/MM/YYYY" }, "Asia/Kolkata", () => {
    assert.equal(formatMoney(150000), "₹1,50,000");
    assert.equal(formatNumber(1234567), "12,34,567");
    assert.equal(moneyLabel("Amount"), "Amount (₹)");
    assert.equal(formatDate("2026-03-09"), "09/03/2026");
  });
});

test("a Dubai school shows dirhams after the amount, in its own style", () => {
  asSchool({ currencyCode: "AED", currencySymbol: "AED", currencyPlace: "after", dateFormat: "DD/MM/YYYY" }, "Asia/Dubai", () => {
    assert.equal(formatMoney(150000), "150,000 AED");
    assert.equal(moneyLabel("Fee"), "Fee (AED)");
    assert.equal(formatMoneyCode(12.5), "AED 12.50");
  });
});

test("a US school gets dollars and MM/DD/YYYY; the symbol comes from the code when none is set", () => {
  asSchool({ currencyCode: "USD", currencySymbol: "", dateFormat: "MM/DD/YYYY" }, "America/New_York", () => {
    assert.equal(currencySymbol(), "$");
    assert.equal(currencyCode(), "USD");
    assert.equal(formatMoney(1500.5), "$1,500.5");
    assert.equal(formatDate("2026-03-09"), "03/09/2026");
  });
});

test("ISO date format, and calendar days never shift across timezones", () => {
  asSchool({ currencyCode: "INR", dateFormat: "YYYY-MM-DD" }, "Pacific/Kiritimati", () => {
    assert.equal(formatDate("2026-12-31"), "2026-12-31");
  });
  asSchool({ currencyCode: "INR", dateFormat: "DD/MM/YYYY" }, "America/Los_Angeles", () => {
    assert.equal(formatDate("2026-01-01"), "01/01/2026");
  });
});

test("today is the school's today, not UTC", () => {
  // 20:00 UTC on 1 Mar is already 2 Mar in India and still 1 Mar in New York.
  const instant = new Date("2026-03-01T20:00:00Z");
  asSchool({}, "Asia/Kolkata", () => assert.equal(schoolToday(instant), "2026-03-02"));
  asSchool({}, "America/New_York", () => assert.equal(schoolToday(instant), "2026-03-01"));
});

test("missing or broken settings fall back to the platform default, never crash", () => {
  asSchool(null, "Not/AZone", () => {
    const locale = schoolLocale();
    assert.equal(locale.currencyCode, "INR");
    assert.equal(locale.timeZone, undefined);
    assert.equal(formatDate(""), "—");
    assert.equal(formatDate("not a date"), "—");
    assert.equal(formatMoney("abc"), "₹0");
  });
});

test("no screen hard-codes the rupee sign, the Indian locale or INR", () => {
  const src = fileURLToPath(new URL("../src/", import.meta.url));
  const offenders = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!/\.(jsx?|mjs)$/.test(name) || /i18n\.jsx$|school-locale\.js$/.test(name)) continue;
      readFileSync(path, "utf8").split("\n").forEach((line, index) => {
        if (/replace\(\/₹\/g/.test(line)) return; // PDF text cleaner for old saved text
        if (/₹|["']en-IN["']|["']INR["']|\bINR \{|'INR '/.test(line)) offenders.push(`${path.slice(src.length)}:${index + 1}`);
      });
    }
  })(src);
  assert.deepEqual(offenders, []);
});
