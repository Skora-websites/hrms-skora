import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Payroll",
  description: "Manage employee payroll, salary components, and pay groups",
  path: "/payroll",
});

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
