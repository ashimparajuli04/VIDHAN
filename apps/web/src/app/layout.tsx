import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/features/auth/provider";

import "./globals.css";

/**
 * Brand wordmark font (caps-suitable). Scoped to --font-brand;
 * the rest of the app keeps its current stack.
 */
const brandFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Vidhan",
  description: "Legal guidance chatbot for Nepal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={brandFont.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
