import type { Metadata } from "next";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
