export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

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
