import type { Metadata } from "next";
import { Space_Grotesk, Roboto_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Monad's brand kit (monad.xyz/brand-and-media-kit) specifies "Britti
// Sans" for headlines — confirmed live on monad.xyz itself via its
// `--font-britti-sans` CSS variable — but it's a commercial typeface from
// Nois Type Studio with no free/Google Fonts distribution. Space Grotesk
// is used here as its closest open-source equivalent: the same sleek,
// geometric, minimalist character.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Matches Monad's brand kit exactly: Roboto Mono for labels, buttons,
// links, code, and decorative elements.
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const title = "Noryx: Live onchain wallet security audit";
const description =
  "Noryx continuously audits your wallet's live approvals and permissions on Monad, explains the risk in plain English, and lets you fix it with a real transaction.";

export const metadata: Metadata = {
  metadataBase: new URL("https://noryx-lyart.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://noryx-lyart.vercel.app",
    siteName: "Noryx",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
