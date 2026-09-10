import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HRMS.pro — Human Resource Management System",
  description:
    "A comprehensive HRM platform for managing employees, attendance, payroll, leaves, assets, and more.",
};

/**
 * /hrms root — redirect to /hrms/dashboard which middleware will
 * further route to the user's role-specific dashboard.
 */
export default function Home() {
  redirect("/hrms/dashboard");
}
