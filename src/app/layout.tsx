import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drug Detection Frontend",
  description: "Next.js frontend foundation for a future drug detection service.",
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
