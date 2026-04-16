import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/providers/SessionProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "FinBudget — Personal Finance Tracker",
  description: "Track your income, expenses, budgets and goals in one place.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinBudget",
  },
  icons: {
    icon: [
      { url: "/logo/icon.svg",          type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/logo/icon.svg",
    apple: [
      { url: "/icons/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/icons/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <PWAInstallPrompt />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
