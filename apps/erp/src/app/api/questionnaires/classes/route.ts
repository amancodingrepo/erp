import { fail, ok } from "@/lib/http";
import { listClasses, requireStaff } from "@/lib/school-world-bridge";

export async function GET(request: Request) {
  try {
    const user = await requireStaff(request);
    const classes = await listClasses(user.campusId);
    return ok({
      classes: classes
        .filter((row) => row.status !== "Inactive")
        .map((row) => ({
          id: row.id,
          class_name: row.name,
          className: row.displayName || [row.name, row.section].filter(Boolean).join(" "),
          section: row.section,
          grade_order: row.displayOrder,
        })),
    });
  } catch (error) {
    return fail(error);
  }
}
