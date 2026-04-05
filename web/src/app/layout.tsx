import type { Metadata } from "next";
import { Inter, Space_Grotesk, Syne } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TextMotion AI — Cinematic Video Generation",
  description: "Turn Words Into Cinematic Video",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${syne.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClerkProvider>
          <Navbar />
          {children}
          <Footer />
        </ClerkProvider>
      </body>
    </html>
  );
}
