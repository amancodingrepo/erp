import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { ActorType } from "@prisma/client";
import { fail } from "@/lib/http";
import { forbidden, notFound } from "@/lib/errors";
import { principalFromRequest } from "@/lib/principal";
import {
  getCampusFile,
  resolveCampusFileAbs,
} from "@/lib/services/campus-files";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await principalFromRequest(request);
    const { id } = await context.params;
    const file = await getCampusFile(user.campusId, id);
    if (file.kind === "staff" && user.actorType !== ActorType.STAFF) {
      throw forbidden("staff only");
    }
    const abs = resolveCampusFileAbs(user.campusId, file);
    let bytes: Buffer;
    try {
      bytes = await readFile(abs);
    } catch {
      throw notFound("file");
    }
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": file.mime || "application/octet-stream",
        "content-disposition": `inline; filename="${file.name.replace(/"/g, "")}"`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
