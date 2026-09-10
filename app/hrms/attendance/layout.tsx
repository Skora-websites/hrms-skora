import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Attendance",
  description: "Track and manage employee attendance and time records",
  path: "/attendance",
});

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
