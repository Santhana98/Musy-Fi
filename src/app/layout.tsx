import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Musi-Fi - Personal Cloud Music Library & Playlist Manager",
  description: "Organize and stream your personal music library directly from your own Google Drive storage and embed YouTube video tracks seamlessly, completely ad-free.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Musi-Fi",
    statusBarStyle: "black-translucent",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-bg-base text-foreground flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
