import { SiteHeader } from "@/components/site-header";

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader active="guide" />
      {children}
    </>
  );
}
