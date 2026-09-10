import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Leaves",
  description: "Manage employee leave requests and balances",
  path: "/leaves",
});

export default function LeavesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
