import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "SKORA HRMS",
  description: "SKORA Human Resource Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
