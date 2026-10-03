import { Scale } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-7 bg-gradient-to-b from-peach-top to-background p-6">
      <div className="flex items-center gap-2.5">
        <Scale className="size-7 text-primary" />
        <span className="text-xl font-bold tracking-tight">Vidhan</span>
      </div>
      {children}
    </div>
  );
}