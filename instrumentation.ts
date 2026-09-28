// Sentry server-side initialization (Node runtime — API routes, SSR).
// Fully env-gated: without SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN this is a
// no-op, so local dev and CI stay clean.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
