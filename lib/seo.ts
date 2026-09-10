import type { Metadata } from "next";

const SITE_NAME = "SudoC";
const SITE_DESCRIPTION = "Complete HRM & CRM platform for modern businesses";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sudoc.app";
const DEFAULT_OG_IMAGE = "/og-image.png";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  ogImage?: string;
}

/**
 * Generates consistent Metadata for pages.
 * Appends the site name to titles and provides sensible defaults.
 */
export function generateMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "",
  noIndex = false,
  ogImage = DEFAULT_OG_IMAGE,
}: SEOProps): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: url },
  };
}
