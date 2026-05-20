import { DashboardHeader } from "@/components/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
