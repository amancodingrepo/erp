import { fail, ok } from "@/lib/http";
import { assertStaff, principalFromRequest } from "@/lib/principal";
import { emailChannelReady } from "@/lib/services/messages";

/**
 * Whether email and SMS actually leave the system or are only logged. Booleans only: the gateway
 * addresses live in server settings and are never sent to the browser.
 */
export async function GET(request: Request) {
  try {
    const user = await principalFromRequest(request);
    assertStaff(user);
    return ok({ email: await emailChannelReady(user.campusId), sms: Boolean(process.env.SMS_WEBHOOK_URL) });
  } catch (error) {
    return fail(error);
  }
}
