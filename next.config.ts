import type { NextConfig } from "next";
// Sentry's build wrapper comes from the dedicated /config export in
// @sentry/nextjs v10+. It only activates when SENTRY_DSN is set; the build
// stays identical (no auth token required) otherwise.
import { withSentryConfig } from "@sentry/nextjs/config";
import type { SentryBuildOptions } from "@sentry/nextjs/config";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/main",
        destination: "/hrms",
        permanent: true,
      },
      {
        source: "/main/:path*",
        destination: "/hrms/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Silence the wizard/telemetry prompts in CI.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Source maps upload is opt-in — only when an auth token is present.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
