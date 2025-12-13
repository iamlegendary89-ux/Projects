import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "SoulMatch — The Destiny-Based Recommendation Engine",
    description: "The one that was waiting for you.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
                <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
                    {children}
                </div>
            </body>
        </html>
    );
}
