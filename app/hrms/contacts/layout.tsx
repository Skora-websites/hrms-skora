import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Contacts",
  description: "Manage your contact directory and relationships",
  path: "/contacts",
});

export default function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
