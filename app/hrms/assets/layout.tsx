import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Assets",
  description: "Manage company assets and employee asset assignments",
  path: "/assets",
});

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
