import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Fallback if system mono fails
import "./globals.css";
import { cn } from "@/lib/utils";
import { BackgroundEffect } from "@/components/background-effect";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LibreNMS Status",
  description: "Status Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          inter.variable,
          "min-h-screen bg-background font-mono antialiased"
        )}
      >
        <BackgroundEffect />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
