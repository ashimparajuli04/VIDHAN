import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-7 bg-gradient-to-b from-peach-top to-background p-6">
      <div className="flex items-center gap-2.5">
        <BrandLogo className="size-8" />
        <span className="font-brand text-xl font-extrabold uppercase tracking-[0.08em]">
          Vidhan
        </span>
      </div>
      {children}
    </div>
  );
}