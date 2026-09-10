import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Employees",
  description: "Manage employee records, profiles, and information",
  path: "/employees",
});

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
