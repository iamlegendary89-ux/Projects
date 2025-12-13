import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartMatch",
  description: "AI-powered smartphone recommendations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void-black text-pure-light antialiased">
        {children}
      </body>
    </html>
  );
}
