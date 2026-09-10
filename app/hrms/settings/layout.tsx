import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Settings",
  description: "Manage your account, security, and application preferences",
  path: "/settings",
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
