import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SpendWise — AI Spend Audit",
  description:
    "Find out exactly where your startup is overspending on AI tools. Get an instant, free audit — no signup required.",
  openGraph: {
    title: "SpendWise — AI Spend Audit",
    description: "Instant AI tool spend audit for startups. Free, no login required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpendWise — AI Spend Audit",
    description: "Instant AI tool spend audit for startups. Free, no login required.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-surface text-white font-body antialiased">
        {children}
      </body>
    </html>
  );
}
