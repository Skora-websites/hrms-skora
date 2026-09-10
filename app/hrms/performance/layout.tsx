import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Performance",
  description: "Manage goals, performance reviews, feedback, and KPI tracking",
  path: "/performance",
});

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
