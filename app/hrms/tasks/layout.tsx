import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Management - HRMS.pro",
  description: "Manage tasks, assignments, and track progress",
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
