import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Exit Management",
  description: "Manage employee exits, clearances, and offboarding process",
  path: "/exit",
});

export default function ExitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
