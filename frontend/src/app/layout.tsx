import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrimeTrust - Modern Online Banking Platform",
  description: "Secure, real-time online banking platform with modern features and seamless user experience.",
  keywords: "online banking, digital banking, secure banking, fintech, PrimeTrust",
  authors: [{ name: "PrimeTrust Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "PrimeTrust - Modern Online Banking Platform",
    description: "Secure, real-time online banking platform with modern features and seamless user experience.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrimeTrust - Modern Online Banking Platform",
    description: "Secure, real-time online banking platform with modern features and seamless user experience.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
