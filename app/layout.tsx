import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";
import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Dashboard",
  description: "Personal home/admin dashboard",
  applicationName: "Home Dashboard",
  appleWebApp: {
    capable: true,
    title: "Home Dashboard",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // width=device-width + initial-scale=1 + viewport-fit=cover so iOS safe-area
  // insets work; maximum-scale=5 lets users pinch-zoom but stops iOS from
  // auto-zooming on input focus (we also bump input font-size to 16px in CSS).
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        {/* iOS home-screen icon — falls back to favicon if apple-touch-icon.png
            is not present in /public. */}
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}