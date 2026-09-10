import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Projects",
  description: "Manage projects, tasks, teams, and milestones",
  path: "/projects",
});

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
