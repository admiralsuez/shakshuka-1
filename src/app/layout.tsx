"use client";

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootLayout({
  children
}: Readonly<{children: React.ReactNode;}>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Shakshuka - Task Manager</title>
        <meta name="description" content="Daily task and strike tracker" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <ErrorReporter />
          <Script
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
            strategy="afterInteractive"
            data-target-origin="*"
            data-message-type="ROUTE_CHANGE"
            data-include-search-params="true"
            data-only-in-iframe="true"
            data-debug="true"
            data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}' />

          {/* Responsive navigation */}
          <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
                {/* Logo */}
                <Link href="/dashboard" className="font-semibold text-base sm:text-lg flex-shrink-0">
                  Shakshuka
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/planner" className="text-muted-foreground hover:text-foreground transition-colors">
                    Planner
                  </Link>
                  <Link href="/reports" className="text-muted-foreground hover:text-foreground transition-colors">
                    Reports
                  </Link>
                  <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
                    Settings
                  </Link>
                </div>

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>

              {/* Mobile Navigation */}
              {mobileMenuOpen && (
                <div className="md:hidden py-4 border-t animate-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-col space-y-3">
                    <Link
                      href="/dashboard"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/planner"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Planner
                    </Link>
                    <Link
                      href="/reports"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Reports
                    </Link>
                    <Link
                      href="/settings"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </header>

          <main className="min-h-[calc(100vh-3.5rem)]">
            {children}
          </main>
          
          <Toaster />
          <VisualEditsMessenger />
        </ThemeProvider>
      </body>
    </html>
  );
}