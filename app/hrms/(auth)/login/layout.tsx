import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Sign In",
  description: "Sign in to your HRMS account",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
