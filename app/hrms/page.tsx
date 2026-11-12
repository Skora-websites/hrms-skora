import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SKORA HRMS — Human Resource Management System",
  description:
    "Enterprise HRM platform for managing employees, attendance, payroll, leaves, and assets.",
};

/**
 * /hrms root — redirect to /hrms/dashboard which middleware will
 * further route to the user's role-specific dashboard.
 */
export default function Home() {
  redirect("/hrms/dashboard");
}
