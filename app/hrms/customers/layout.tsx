import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Customers",
  description: "Manage your customer relationships and track lifetime value",
  path: "/customers",
});

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
