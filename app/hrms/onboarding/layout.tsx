import { generateMetadata } from "@/lib/seo";

export const metadata = generateMetadata({
  title: "Onboarding",
  description: "Manage employee onboarding process and checklists",
  path: "/onboarding",
});

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
