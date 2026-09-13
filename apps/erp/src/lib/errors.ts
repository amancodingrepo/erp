export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  errors?: unknown;

  constructor(
    status: number,
    code: string,
    message?: string,
    fields?: Record<string, string>,
  ) {
    super(message ?? code);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function unauthenticated() {
  return new HttpError(401, "unauthenticated");
}

export function forbidden(message = "forbidden") {
  return new HttpError(403, "forbidden", message);
}

export function notFound(entity = "resource") {
  return new HttpError(404, "not_found", `${entity} not found`);
}

export function conflict(message: string) {
  return new HttpError(409, "conflict", message);
}

export function validationError(fields: Record<string, string>) {
  return new HttpError(422, "validation_error", "validation_error", fields);
}

export function rateLimited() {
  return new HttpError(429, "rate_limited");
}

/** Duck-type Prisma errors so unique/not-found still map if client copies differ. */
export function prismaErrorCode(error: unknown): string | null {
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i++) {
    if (typeof current === "object" && current && "code" in current) {
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string" && /^P\d{4}$/.test(code)) return code;
    }
    current =
      typeof current === "object" && current && "cause" in current
        ? (current as { cause: unknown }).cause
        : null;
  }
  if (
    error instanceof Error &&
    /unique constraint/i.test(error.message)
  ) {
    return "P2002";
  }
  return null;
}
