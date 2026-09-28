// Sentry initialization — browser + Edge middleware.
// Fully env-gated: without NEXT_PUBLIC_SENTRY_DSN nothing loads, no overhead,
// no network calls. Get a DSN at https://sentry.io → Settings → Client Keys.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    // Keep noise low: page-level visibility and sampling are enough for an
    // internal HRMS; raise tracesSampleRate if you need performance insight.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.2,
  });
}
