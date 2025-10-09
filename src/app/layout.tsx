import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { ColorCustomizer } from "@/components/ColorCustomizer";
import { AppWrapper } from "@/components/AppWrapper";
import { ExitConfirmation } from "@/components/ExitConfirmation";
import { ExitConfirmationProvider } from "@/components/ExitConfirmationProvider";
import { ExitButton } from "@/components/ExitButton";
import { CustomTitleBar, ConditionalHeader } from "@/components/CustomTitleBar";
import Script from "next/script";

// Initialize developer logger
if (typeof window !== "undefined") {
  import("@/lib/developer-logger").then(({ getDeveloperLogger }) => {
    getDeveloperLogger();
  });
}

export const metadata: Metadata = {
  title: "Shakshuka - Task & Strike Tracker",
  description: "Track your daily strikes, monitor progress, and manage tasks efficiently",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "32x32" },
    ],
    apple: { url: "/apple-icon.png?v=2", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <ColorCustomizer />
          <ErrorReporter />
          <Script
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
            strategy="afterInteractive"
            data-target-origin="*"
            data-message-type="ROUTE_CHANGE"
            data-include-search-params="true"
            data-only-in-iframe="true"
            data-debug="true"
            data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
          />
          <ExitConfirmationProvider>
            {/* Custom Title Bar */}
            <CustomTitleBar />
            
            {/* Responsive top navigation */}
            <ConditionalHeader>
              <nav className="mx-auto max-w-5xl px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4 text-sm">
                <Link
                  href="/dashboard"
                  className="font-bold text-base sm:text-lg shrink-0 hover:opacity-80 transition-opacity"
                >
                  Shakshuka
                </Link>
                <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground overflow-x-auto">
                  <Link href="/dashboard" className="hover:text-foreground whitespace-nowrap transition-colors">Dashboard</Link>
                  <Link href="/daily-planner" className="hover:text-foreground whitespace-nowrap transition-colors">Daily Planner</Link>
                  <Link href="/reports" className="hover:text-foreground whitespace-nowrap transition-colors">Reports</Link>
                  <Link href="/settings" className="hover:text-foreground whitespace-nowrap transition-colors">Settings</Link>
                </div>
              </nav>
            </ConditionalHeader>
            <AppWrapper>
              {children}
            </AppWrapper>
            <Toaster />
            <VisualEditsMessenger />
          </ExitConfirmationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}