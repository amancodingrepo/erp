import { z } from "zod";
import { fail, ok, readJson } from "@/lib/http";
import { rateLimited } from "@/lib/errors";
import { hitLoginRateLimit } from "@/lib/rate-limit-db";
import { requestCampusOtp } from "@/lib/services/otp";

const bodySchema = z.object({
  username: z.string().min(1),
  portal: z.enum(["staff", "student", "parent"]).default("staff"),
  campusCode: z.string().min(2).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const body = bodySchema.parse(await readJson(request));
    const key = `otp:${body.username}:${ip}`;
    if (await hitLoginRateLimit(key, 5)) {
      throw rateLimited();
    }
    return ok(await requestCampusOtp(body));
  } catch (error) {
    return fail(error);
  }
}
