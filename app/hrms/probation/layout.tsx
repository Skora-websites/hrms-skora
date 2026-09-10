import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Probation",
  description: "Manage employee probation periods and reviews",
  path: "/probation",
});

export default function ProbationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
