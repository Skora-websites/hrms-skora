import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Leads",
  description: "Manage and track your sales leads pipeline",
  path: "/leads",
});

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
