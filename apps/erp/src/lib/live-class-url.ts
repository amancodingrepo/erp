const MEETING_HOSTS = [
  "meet.google.com",
  "zoom.us",
  "zoom.com",
];

function hostAllowed(hostname: string, extra: string[] = []) {
  const host = hostname.toLowerCase();
  return [...MEETING_HOSTS, ...extra].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function liveMeetingUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!hostAllowed(parsed.hostname)) return null;
  return parsed.toString();
}

export function liveRecordingUrl(raw: string | undefined) {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const extra = ["youtube.com", "youtu.be", "drive.google.com"];
  if (!hostAllowed(parsed.hostname, extra)) return null;
  return parsed.toString();
}
