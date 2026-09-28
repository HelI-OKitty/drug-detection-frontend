import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENTINEL | 마약 거래 의심 게시글 탐지",
  description: "게시글 텍스트를 분석해 마약 거래 의심 여부를 판별하는 SENTINEL 콘솔",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
