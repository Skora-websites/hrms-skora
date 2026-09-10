import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Engage",
  description: "Employee engagement, posts, comments, and company feed",
  path: "/engage",
});

export default function EngageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
