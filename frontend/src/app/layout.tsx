import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import GlobalAccountLockModal from "@/components/GlobalAccountLockModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "PrimeTrust - Modern Online Banking Platform",
  description: "Secure, real-time online banking platform with modern features and seamless user experience.",
  keywords: "online banking, digital banking, secure banking, fintech, PrimeTrust",
  authors: [{ name: "PrimeTrust Team" }],
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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <GlobalAccountLockModal />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
