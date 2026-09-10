import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Documents",
  description: "Manage employee documents and company files",
  path: "/documents",
});

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
