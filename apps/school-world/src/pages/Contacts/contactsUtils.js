import { appLocale, formatDate } from "../../school-locale.js";
export { downloadCsvFile as csvDownload } from "../../shared/csvUtils.js";
export function classLabel(className, section) {
  const cls = String(className || "").trim();
  const sec = String(section || "").trim();
  return cls ? cls + (sec ? " (" + sec + ")" : "") : "—";
}
export function relativeLastSeen(value) {
  if (!value) return "Last seen —";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Last seen —";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Last seen just now";
  if (seconds < 3600) return "Last seen " + Math.floor(seconds / 60) + " minute(s) ago";
  if (seconds < 86400) return "Last seen " + Math.floor(seconds / 3600) + " hour(s) ago";
  if (seconds < 86400 * 30) return "Last seen " + Math.floor(seconds / 86400) + " day(s) ago";
  return "Last seen " + formatDate(date) + " " + date.toLocaleTimeString(appLocale(), { hour: "numeric", minute: "2-digit" });
}
export const DEFAULT_CONTACT_COLUMN_ORDER = ["name","type","studentId","class","parent","email","phone","gender","status","lastSeen"];
export const DEFAULT_CONTACT_COLUMN_WIDTHS = {name:250,type:110,studentId:130,class:135,parent:180,email:220,phone:135,gender:110,status:100,lastSeen:145,actions:86};
export const DEFAULT_CONTACT_VISIBLE_COLUMNS = [...DEFAULT_CONTACT_COLUMN_ORDER,"actions"];

export function displayGender(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
  if (/^(female|f|girl|girls|woman|women)$/.test(normalized) || normalized.startsWith("female ")) return "Female";
  if (/^(male|m|boy|boys|man|men)$/.test(normalized) || normalized.startsWith("male ")) return "Male";
  if (!normalized || /^(not specified|not set|unknown|n\/a|na|null|undefined|other|prefer not to say)$/.test(normalized)) return "Not Specified";
  return String(value).trim();
}
export function matchesGender(value, selectedGender) {
  if (!selectedGender) return true;
  return displayGender(value) === selectedGender;
}

