import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "HR Admin Dashboard",
  description: "HR Administration: employee management, onboarding, payroll, projects & budgets",
  path: "/hr-admin",
});

export default function HrAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
