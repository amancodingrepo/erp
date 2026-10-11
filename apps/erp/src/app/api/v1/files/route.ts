import { created, fail } from "@/lib/http";
import { validationError } from "@/lib/errors";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { saveCampusFile } from "@/lib/services/campus-files";

export async function POST(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw validationError({ file: "file required" });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await saveCampusFile({
      campusId: user.campusId,
      kind: String(form.get("kind") ?? "general"),
      name: String(form.get("name") ?? file.name),
      filename: file.name,
      mime: file.type,
      bytes,
      ownerId: String(form.get("ownerId") ?? "").trim() || undefined,
    });
    return created({
      id: saved.id,
      url: saved.url,
      name: saved.name,
      mime: saved.mime,
      kind: saved.kind,
      bytes: saved.bytes,
    });
  } catch (error) {
    return fail(error);
  }
}
