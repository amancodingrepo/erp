import { Prisma } from "@prisma/client";
import { signAuthToken } from "@/lib/auth-token";
import { campusSummary } from "@/lib/campus";
import { fail, ok, readJson } from "@/lib/http";
import { authenticateCredentials } from "@/lib/principal";
import { prisma } from "@/lib/db";
import { schoolWorldUser } from "@/lib/school-world-shape";
import { HttpError } from "@/lib/errors";

const portals = ["staff", "student", "parent"] as const;
const databaseErrorCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1017", "P2024"]);

function isDatabaseFailure(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError && databaseErrorCodes.has(error.code)) return true;
  return false;
}

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email?: string; username?: string; password?: string }>(request);
    const username = String(body.username || body.email || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      throw new HttpError(401, "unauthenticated", "Email or password is incorrect.");
    }
    let principal = null;
    for (const portal of portals) {
      try {
        principal = await authenticateCredentials({ username, password, portal });
        break;
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) {
          principal = null;
          continue;
        }
        throw error;
      }
    }
    if (!principal) {
      throw new HttpError(401, "unauthenticated", "Email or password is incorrect.");
    }
    const [account, campus] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: principal.id } }),
      campusSummary(principal.campusId),
    ]);
    const token = await signAuthToken(principal);
    const response = ok({
      user: schoolWorldUser(principal, account, campus),
    });
    response.cookies.set("erp_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    if (isDatabaseFailure(error)) {
      console.error(error);
      return fail(new HttpError(503, "unavailable", "The school database is not reachable."));
    }
    return fail(error);
  }
}
