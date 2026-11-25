import type { ReactNode } from "react";
import "./globals.css";
import { AgentationProvider } from "@/components/agentation-provider";

export const metadata = {
  title: "SKORA HRMS",
  description: "SKORA Human Resource Management System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <AgentationProvider />
      </body>
    </html>
  );
}

