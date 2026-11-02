import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

// The public site is the School World app. College screens stay on /staff and /login.
export async function GET() {
  const file = path.join(process.cwd(), "public", "school-world", "index.html");
  try {
    const html = await readFile(file, "utf8");
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  } catch {
    return new Response("School World frontend is not built.", { status: 503 });
  }
}
