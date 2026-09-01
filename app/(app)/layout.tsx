import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "MOBILE PULSE — App Development Weekly",
  description: "每週整理值得帶回團隊的 App 開發技術與工具訊號。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
