// How the signed-in school writes money, numbers and dates.
//
// Every campus has its own currency (code, symbol, before/after), date format and timezone in
// Campus settings. The session carries them as user.school.locale and user.school.timezone, which
// DatabaseSession copies to window.SCHOOL_DIARY_CONFIG. Screens format through these helpers
// instead of a fixed "₹", "en-IN" or "Asia/Kolkata".

// Number style that matches a currency's home (lakh grouping for INR, and so on).
const CURRENCY_LOCALE = {
  INR: "en-IN", USD: "en-US", GBP: "en-GB", EUR: "en-IE", AED: "en-AE", SAR: "en-SA", QAR: "en-QA",
  KWD: "en-KW", OMR: "en-OM", BHD: "en-BH", SGD: "en-SG", MYR: "en-MY", NPR: "en-NP", LKR: "en-LK",
  BDT: "en-BD", PKR: "en-PK", AUD: "en-AU", NZD: "en-NZ", CAD: "en-CA", ZAR: "en-ZA", KES: "en-KE",
  NGN: "en-NG", JPY: "ja-JP",
};

function config() {
  if (typeof window === "undefined") return {};
  return window.SCHOOL_DIARY_CONFIG || window.__SCHOOL_DIARY_CONFIG__ || {};
}

/** The school's locale settings, with the platform's defaults (India) only where a value is missing. */
export function schoolLocale(source = config()) {
  const own = source.schoolLocale || {};
  const currencyCode = String(own.currencyCode || "INR").toUpperCase();
  return {
    currencyCode,
    currencySymbol: String(own.currencySymbol || "").trim() || symbolFor(currencyCode),
    currencyPlace: own.currencyPlace === "after" ? "after" : "before",
    dateFormat: String(own.dateFormat || "DD/MM/YYYY").toUpperCase(),
    timeZone: validTimeZone(source.schoolTimezone) || undefined,
    locale: CURRENCY_LOCALE[currencyCode] || "en",
  };
}

function symbolFor(code) {
  try {
    const part = new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
      .formatToParts(0).find((item) => item.type === "currency");
    return part?.value || code;
  } catch {
    return code;
  }
}

function validTimeZone(zone) {
  if (!zone) return "";
  try { new Intl.DateTimeFormat("en", { timeZone: zone }); return zone; } catch { return ""; }
}

/** Locale tag for number and date formatting ("en-IN" for an Indian school). */
export const appLocale = () => schoolLocale().locale;
export const currencySymbol = () => schoolLocale().currencySymbol;
export const currencyCode = () => schoolLocale().currencyCode;

/** A field label with the school's currency: moneyLabel("Amount") → "Amount (₹)". */
export const moneyLabel = (label) => `${label} (${currencySymbol()})`;

/** A number in the school's style: formatNumber(150000) → "1,50,000" for an Indian school. */
export function formatNumber(value, options = {}) {
  const number = Number(value || 0);
  return (Number.isFinite(number) ? number : 0).toLocaleString(appLocale(), options);
}

/**
 * Money with the school's symbol, placed before or after: formatMoney(1500) → "₹1,500".
 * `options` are Intl number options (default: up to 2 decimals).
 */
export function formatMoney(value, options = { maximumFractionDigits: 2 }, locale = schoolLocale()) {
  const number = Number(value || 0);
  const text = (Number.isFinite(number) ? number : 0).toLocaleString(locale.locale, options);
  return locale.currencyPlace === "after" ? `${text} ${locale.currencySymbol}` : `${locale.currencySymbol}${text}`;
}

/** Money for plain-text documents that can't show every symbol (PDF text): "INR 1,500.00". */
export function formatMoneyCode(value, options = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) {
  return `${currencyCode()} ${formatNumber(value, options)}`;
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value == null || value === "") return null;
  // A plain YYYY-MM-DD is a calendar day: read it as midday so no timezone moves it to another day.
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(text + "T12:00:00") : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A date in the school's style. With Intl `options` it uses the school's locale and timezone
 * (formatDate(d, { month: "long" })). Without, it follows the school's date format
 * (DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD). Empty or invalid values give `fallback`.
 */
export function formatDate(value, options, fallback = "—") {
  const date = toDate(value);
  if (!date) return fallback;
  const locale = schoolLocale();
  const timeZone = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? undefined : locale.timeZone;
  if (options) return date.toLocaleDateString(locale.locale, { ...options, timeZone });
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone })
    .formatToParts(date).map((part) => [part.type, part.value]));
  if (locale.dateFormat.startsWith("YYYY")) return `${parts.year}-${parts.month}-${parts.day}`;
  if (locale.dateFormat.startsWith("MM")) return `${parts.month}/${parts.day}/${parts.year}`;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

/** A date and time in the school's locale and timezone. */
export function formatDateTime(value, options = { dateStyle: "medium", timeStyle: "short" }, fallback = "—") {
  const date = toDate(value);
  if (!date) return fallback;
  const locale = schoolLocale();
  return date.toLocaleString(locale.locale, { ...options, timeZone: locale.timeZone });
}

/** A time of day in the school's locale and timezone. */
export function formatTime(value, options = { hour: "2-digit", minute: "2-digit" }, fallback = "") {
  const date = toDate(value);
  if (!date) return fallback;
  const locale = schoolLocale();
  return date.toLocaleTimeString(locale.locale, { ...options, timeZone: locale.timeZone });
}

/** Today's date (YYYY-MM-DD) at the school, not in UTC or the browser's zone. */
export function schoolToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: schoolLocale().timeZone })
    .formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
