import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/providers/LenisProvider";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Dynasity-Voult | Digital Heritage House",
  description:
    "A premier digital heritage house dedicated to the curation, documentation, exhibition, and transaction of rare, ancient, and historically significant artifacts.",
  keywords: [
    "rare artifacts",
    "auction house",
    "digital heritage",
    "antiques",
    "fine art",
    "premium collection",
    "provenance",
    "Dynasity-Voult",
  ],
  openGraph: {
    title: "Dynasity-Voult | Digital Heritage House",
    description:
      "Discover rare, ancient, and historically significant artifacts. Premium auctions, exhibitions, and curated collections.",
    type: "website",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <LenisProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </LenisProvider>
      </body>
    </html>
  );
}
