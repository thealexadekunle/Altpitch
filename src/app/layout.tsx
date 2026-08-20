import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** Corrections 03 §4 — Space Grotesk for all UI chrome, scores and headings: squared forms that
 * read "instrument" rather than "startup landing page", and it carries tabular numerals (see
 * globals.css). 600 is loaded alongside the specced 400/500/700 because the existing components
 * use font-semibold; without it the browser synthesizes the weight. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  fallback: ["system-ui", "sans-serif"],
});

/** Body-heavy surfaces only (long proposals in the editor) — see the .prose-reading utility. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Altpitch — AI Proposal OS",
  description: "Judgment, not generation. Analyze Upwork jobs, decide, and write proposals that land.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        <TooltipProvider delayDuration={200}>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
