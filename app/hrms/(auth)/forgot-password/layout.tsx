import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Forgot Password",
  description: "Reset your HRMS account password",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
