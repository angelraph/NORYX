import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Canela is a commercial typeface with no free distribution, so headings
// use Fraunces — the open-source serif designers reach for as its closest
// free equivalent: same elegant, high-contrast warmth.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noryx: Live onchain wallet security audit",
  description:
    "Noryx continuously audits your wallet's live approvals and permissions on Monad, explains the risk in plain English, and lets you fix it with a real transaction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
