import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

// ── Response status codes ────────────────────────────

const STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY: 429,
  INTERNAL: 500,
} as const;

// ── Response helpers ──────────────────────────────────

export function ok<T>(data: T) {
  return NextResponse.json({ data }, { status: STATUS.OK });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: STATUS.CREATED });
}

export function noContent() {
  return new NextResponse(null, { status: STATUS.NO_CONTENT });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: STATUS.BAD_REQUEST });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: STATUS.UNAUTHORIZED });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: STATUS.FORBIDDEN });
}

export function notFound(message = "Resource not found") {
  return NextResponse.json({ error: message }, { status: STATUS.NOT_FOUND });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: STATUS.CONFLICT });
}

// ── Error handler wrapper ────────────────────────────

// Route handler type compatible with Next.js App Router
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<any>;

type ErrorHandlerOptions = {
  /** Route label for error logging */
  label?: string;
};

/**
 * Wraps an API route handler with standardized error handling.
 * Catches errors, logs them via the centralized logger, and
 * returns a structured error response.
 */
export function withErrorHandler(
  handler: RouteHandler,
  options?: ErrorHandlerOptions
): RouteHandler {
  const routeLabel = options?.label || "API";

  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const method = request.method;
      const url = request.nextUrl.pathname;

      logger.error(`[${routeLabel}] ${method} ${url}`, error);

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      // Handle Database Duplicate Key errors (Mongo E11000 or MySQL ER_DUP_ENTRY 1062)
      if (error && typeof error === "object" && "code" in error) {
        const dbError = error as { code: number | string };
        if (dbError.code === 11000 || dbError.code === 1062 || dbError.code === "ER_DUP_ENTRY") {
          return conflict("A record with this identifier or email already exists");
        }
      }

      // Handle validation errors
      if (error instanceof Error && error.name === "ZodError") {
        return badRequest(error.message);
      }

      // Handle JSON body syntax errors (e.g. empty body or invalid JSON)
      if (isInvalidJsonError(error)) {
        return badRequest("Invalid or empty JSON payload");
      }

      // Handle invalid MongoDB ObjectId (BSONError)
      if (
        error instanceof Error &&
        (error.name === "BSONError" ||
          error.message.includes("24 character hex string"))
      ) {
        return badRequest("Invalid ID format");
      }

      // Don't leak internal error details to the client
      const isDev = process.env.NODE_ENV === "development";
      const clientMessage = isDev && error instanceof Error
        ? error.message
        : "Internal server error. Please try again later.";

      return NextResponse.json(
        { error: clientMessage },
        { status: STATUS.INTERNAL }
      );
    }
  };
}

export function isInvalidJsonError(error: unknown): boolean {
  if (error instanceof SyntaxError) return true;
  if (error instanceof Error) {
    return (
      error.name === "SyntaxError" ||
      error.message.includes("JSON") ||
      error.message.includes("Unexpected end of JSON input")
    );
  }
  return false;
}

export async function safeParseJson<T = Record<string, any>>(
  request: NextRequest
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { error: badRequest("Request body must be a JSON object") };
    }
    return { data: data as T };
  } catch {
    return { error: badRequest("Invalid or empty JSON payload") };
  }
}

// ── Custom API Error class ───────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(msg: string) {
    return new ApiError(msg, STATUS.BAD_REQUEST);
  }

  static unauthorized(msg = "Unauthorized") {
    return new ApiError(msg, STATUS.UNAUTHORIZED);
  }

  static forbidden(msg = "Forbidden") {
    return new ApiError(msg, STATUS.FORBIDDEN);
  }

  static notFound(msg = "Resource not found") {
    return new ApiError(msg, STATUS.NOT_FOUND);
  }

  static conflict(msg: string) {
    return new ApiError(msg, STATUS.CONFLICT);
  }
}
