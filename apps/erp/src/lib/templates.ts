const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(
  source: string,
  vars: Record<string, string | number | null | undefined>,
) {
  return source.replace(TOKEN, (_, key: string) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}
