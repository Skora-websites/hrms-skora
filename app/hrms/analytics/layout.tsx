import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Analytics",
  description: "Detailed insights and performance metrics for your business",
  path: "/analytics",
});

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
