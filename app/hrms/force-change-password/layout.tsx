import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password — Skora HRMS",
  description: "Set your new password on first login",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
