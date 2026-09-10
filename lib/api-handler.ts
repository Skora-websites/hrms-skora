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

      // Handle MongoDB Duplicate Key (E11000) errors
      if (error && typeof error === "object" && "code" in error) {
        const dbError = error as { code: number | string };
        if (dbError.code === 11000) {
          return conflict("A record with this identifier or email already exists");
        }
      }

      // Handle validation errors
      if (error instanceof Error && error.name === "ZodError") {
        return badRequest(error.message);
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
