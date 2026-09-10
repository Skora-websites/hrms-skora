import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Organization",
  description: "Manage your organization structure, departments, and designations",
  path: "/organization",
});

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
