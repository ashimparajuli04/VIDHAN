import { Scale } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="flex items-center gap-2">
        <Scale className="size-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">VIDHAN</span>
      </div>
      {children}
    </div>
  );
}
