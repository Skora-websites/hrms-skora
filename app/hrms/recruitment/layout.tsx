import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Recruitment",
  description: "Manage job postings, candidates, and recruitment workflow",
  path: "/recruitment",
});

export default function RecruitmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
