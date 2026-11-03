import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ShellFallback } from "@/components/layout/skeletons";
import { listItems, projectOptionsFrom } from "@/lib/db/queries";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NoX Organizer",
    template: "%s — NoX Organizer",
  },
  description:
    "A self-hosted organizer for projects, ideas, and a dependency-aware work queue.",
};

/**
 * The shell fetches the project list once per request so the "New" menus
 * can offer ideas their project-link options. Data runs at request time,
 * so it is streamed inside a Suspense boundary.
 */
async function Shell({ children }: { children: React.ReactNode }) {
  const items = await listItems();
  return <AppShell projects={projectOptionsFrom(items)}>{children}</AppShell>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<ShellFallback />}>
            <Shell>{children}</Shell>
          </Suspense>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
