import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ticket System - HRMS.pro",
  description: "Support tickets, requests, and issue tracking",
};

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
