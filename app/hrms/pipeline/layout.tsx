import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Sales Pipeline",
  description: "Manage deals through sales stages from lead to closed",
  path: "/pipeline",
});

export default function PipelineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
