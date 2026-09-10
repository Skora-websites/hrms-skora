import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Dashboard",
  description: "Overview of your sales performance and key metrics",
  path: "/dashboard",
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
