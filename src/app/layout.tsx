import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Director AI - Storyboard Copilot",
  description: "AI powered music video storyboarding",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 1. Added "dark" class here to ensure your theme loads!
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      {/* 2. STRICT LOCK: h-screen, w-screen, and overflow-hidden */}
      <body className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50 antialiased flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}