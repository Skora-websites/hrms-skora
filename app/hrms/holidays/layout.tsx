import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Holidays",
  description: "View and manage company holiday schedules",
  path: "/holidays",
});

export default function HolidaysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
