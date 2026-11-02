import { NextResponse } from "next/server";
import { HttpError, prismaErrorCode } from "./errors";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
        ...(error.errors ? { errors: error.errors } : {}),
      },
      { status: error.status },
    );
  }
  if (prismaErrorCode(error) === "P2002") {
    return NextResponse.json(
      { error: "conflict", message: "duplicate" },
      { status: 409 },
    );
  }
  if (prismaErrorCode(error) === "P2025") {
    return NextResponse.json(
      { error: "not_found", message: "not found" },
      { status: 404 },
    );
  }
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "body";
      fields[key] = issue.message;
    }
    return NextResponse.json(
      { error: "validation_error", fields },
      { status: 422 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: "internal_error" },
    { status: 500 },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(422, "validation_error", "invalid json");
  }
}
