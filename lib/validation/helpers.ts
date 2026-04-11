import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Parse and validate a request body. On failure, returns a 400 NextResponse.
 * Usage:
 *   const parsed = await validateBody(request, createTaskSchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const data = parsed;
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: result.error.issues },
      { status: 400 }
    );
  }
  return result.data;
}

/** Validate URL search params against a schema. */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: ZodType<T>
): T | NextResponse {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: result.error.issues },
      { status: 400 }
    );
  }
  return result.data;
}

/** Validate a positive-integer route param like [id]. */
export function parseIdParam(raw: string): number | NextResponse {
  const id = parseInt(raw, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  return id;
}
