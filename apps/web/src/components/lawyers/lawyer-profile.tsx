"use client";

import * as React from "react";
import { BadgeCheck, Calendar, ChevronLeft, MapPin } from "lucide-react";
import Link from "next/link";

import type { TPublicLawyerDetail } from "@vidhan/schema";

import { PigAvatar } from "@/components/lawyers/pig-avatar";
import { LawyerProfileSkeleton } from "@/components/lawyers/lawyer-profile-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { districtLabel, languageLabel, practiceAreaLabel } from "@/features/lawyers/labels";
import { getLawyer } from "@/lib/lawyers";

/**
 * Lawyer profile page.
 *
 * Mobile-first: hero, then quiet sections, with the primary CTA pinned to
 * the bottom. From `lg` the CTA and professional facts sit in a sticky
 * side column instead.
 */
export function LawyerProfile({ id }: { id: string }) {
  const [lawyer, setLawyer] = React.useState<TPublicLawyerDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    getLawyer(id)
      .then((result) => {
        if (!active) return;
        setLawyer(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLawyer(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-36 md:px-8 lg:pt-8 lg:pb-16">
      <nav aria-label="Breadcrumb">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mx-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Link href="/lawyers">
            <ChevronLeft className="size-4" />
            All lawyers
          </Link>
        </Button>
      </nav>

      {loading ? (
        <LawyerProfileSkeleton />
      ) : lawyer ? (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          <div className="min-w-0 space-y-12 md:space-y-14">
            {/* ── Hero ── */}
            <section className="flex flex-col items-center gap-6 pt-8 text-center lg:flex-row lg:items-start lg:gap-8 lg:pt-10 lg:text-left">
              <PigAvatar
                name={lawyer.name}
                className="size-28 shadow-sm ring-1 ring-border/70 lg:size-32"
              />
              <div className="flex min-w-0 max-w-xl flex-col items-center gap-3 lg:items-start lg:pt-1.5">
                <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                  {lawyer.name}
                </h1>

                {lawyer.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                    <BadgeCheck className="size-3.5" />
                    Verified by Vidhan
                  </span>
                )}

                <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted-foreground lg:justify-start">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" />
                    {districtLabel(lawyer.district)}
                  </span>
                  {typeof lawyer.yearsOfExperience === "number" && (
                    <>
                      <span aria-hidden="true" className="text-border">
                        ·
                      </span>
                      <span>{lawyer.yearsOfExperience} yrs experience</span>
                    </>
                  )}
                </p>
              </div>
            </section>

            {/* ── Content sections ── */}
            {lawyer.bio && (
              <Section title="About">
                <p className="max-w-prose text-[15px] leading-7 text-foreground/80">
                  {lawyer.bio}
                </p>
              </Section>
            )}

            <Section title="Practice areas">
              <ul className="flex flex-wrap gap-2">
                {lawyer.practiceAreas.map((area) => (
                  <li key={area}>
                    <Badge
                      variant="secondary"
                      className="px-3 py-1 text-[13px] font-medium"
                    >
                      {practiceAreaLabel(area)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Languages">
              <ul className="flex flex-wrap gap-2">
                {lawyer.languages.map((language) => (
                  <li key={language}>
                    <Badge
                      variant="outline"
                      className="bg-transparent px-3 py-1 text-[13px] font-medium text-foreground/80"
                    >
                      {languageLabel(language)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          {/* ── Desktop aside: CTA + facts ── */}
          <aside className="lg:sticky lg:top-8 lg:self-start lg:space-y-8">
            <div className="hidden lg:block">
              <BookButton bookingUrl={lawyer.bookingUrl} />
            </div>

            <Section title="Professional information">
              <dl className="divide-y divide-border rounded-xl border bg-card/40">
                {lawyer.barNumber && (
                  <InfoRow label="Bar number" value={lawyer.barNumber} />
                )}
                {typeof lawyer.yearsOfExperience === "number" && (
                  <InfoRow
                    label="Years of experience"
                    value={`${lawyer.yearsOfExperience} years`}
                  />
                )}
                <InfoRow label="Based in" value={districtLabel(lawyer.district)} />
              </dl>
            </Section>
          </aside>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Lawyer not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This profile is unavailable or no longer exists.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/lawyers">Back to the catalogue</Link>
          </Button>
        </div>
      )}

      {/* ── Mobile / tablet pinned CTA ── */}
      {!loading && lawyer && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <BookButton bookingUrl={lawyer.bookingUrl} />
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function BookButton({ bookingUrl }: { bookingUrl: string | null }) {
  if (!bookingUrl) {
    return (
      <Button variant="outline" size="lg" className="w-full" disabled>
        <Calendar />
        Booking link coming soon
      </Button>
    );
  }
  return (
    <Button asChild size="lg" className="w-full">
      <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
        <Calendar />
        Book a consultation
      </a>
    </Button>
  );
}