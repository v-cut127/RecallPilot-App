import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RecallPilot — Recall revenue audit",
    template: "%s · RecallPilot",
  },
  description:
    "Import your practice CSV and see overdue patients, lapsed recalls and estimated production at risk. Every estimate shows its assumptions.",
  icons: {
    icon: "/brand/favicon-light.png",
    apple: "/brand/touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
