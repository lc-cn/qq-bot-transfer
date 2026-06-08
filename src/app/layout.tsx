import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QQ Bot 网关",
  description: "Webhook → WebSocket 多租户转发网关",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900">{children}</body>
    </html>
  );
}
