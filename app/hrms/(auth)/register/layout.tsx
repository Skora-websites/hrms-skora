import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Create Account",
  description: "Register for your HRMS account",
  path: "/register",
  noIndex: true,
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
