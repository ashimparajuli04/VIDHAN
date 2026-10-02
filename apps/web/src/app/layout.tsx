import type { Metadata } from "next";

import { Chrome } from "@/components/layout/chrome";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Chrome>{children}</Chrome>
        </ThemeProvider>
      </body>
    </html>
  );
}