"use client";

import * as React from "react";
import {
  BadgeCheck,
  Building2,
  Calendar,
  ChevronLeft,
  MapPin,
  Phone,
  Video,
} from "lucide-react";
import Link from "next/link";

import type {
  TConsultationMode,
  TPublicLawyer,
  TPublicLawyerDetail,
} from "@vidhan/schema";

import { PigAvatar } from "@/components/lawyers/pig-avatar";
import { LawyerCard } from "@/components/lawyers/lawyer-card";
import { LawyerProfileSkeleton } from "@/components/lawyers/lawyer-profile-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  consultationModeLabel,
  courtLabel,
  districtLabel,
  languageLabel,
  practiceAreaLabel,
} from "@/features/lawyers/labels";
import { getLawyer, getLawyers } from "@/lib/lawyers";

const MAX_RELATED = 3;

const MODE_ICONS: Record<TConsultationMode, typeof Building2> = {
  in_person: Building2,
  phone: Phone,
  video: Video,
};

/**
 * Lawyer profile page.
 *
 * Compact left-aligned hero (name, location, experience, practice areas),
 * then decision-useful sections (About, Consultation, Courts, Education &
 * credentials) that each render only when they carry data. The sticky side
 * column on `lg` holds the booking CTA and facts; on mobile the CTA is
 * pinned to the bottom. A related-lawyers row reuses the catalogue card.
 * Contact details are deliberately absent — bookingUrl is the only reach
 * mechanism (see docs/web-lawyer-details.md).
 */
export function LawyerProfile({ id }: { id: string }) {
  const [lawyer, setLawyer] = React.useState<TPublicLawyerDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [allLawyers, setAllLawyers] = React.useState<TPublicLawyer[]>([]);

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

  // Related row needs the catalogue; fail silently — the section hides
  // when there is no list data.
  React.useEffect(() => {
    let active = true;
    getLawyers({})
      .then((results) => {
        if (active) setAllLawyers(results);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const related = React.useMemo(() => {
    if (!lawyer) return [];
    // insert schema guarantees a non-empty practiceAreas array
    const primary = lawyer.practiceAreas[0]!;
    return allLawyers
      .filter(
        (candidate) =>
          candidate.id !== lawyer.id &&
          candidate.district === lawyer.district &&
          candidate.practiceAreas.includes(primary),
      )
      .slice(0, MAX_RELATED);
  }, [allLawyers, lawyer]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-36 md:px-8 lg:pt-8 lg:pb-16">
      <nav aria-label="Breadcrumb">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-mx-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/lawyers">
            <ChevronLeft className="size-5" />
            All lawyers
          </Link>
        </Button>
      </nav>

      {loading ? (
        <LawyerProfileSkeleton />
      ) : lawyer ? (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
            <div className="min-w-0 space-y-8">
              {/* ── Hero ── */}
              <section className="space-y-6">
                <div className="flex items-start gap-5 md:gap-7">
                  <PigAvatar
                    name={lawyer.name}
                    className="mt-1 size-20 shrink-0 md:size-28"
                  />

                  <div className="min-w-0 space-y-3 md:pt-1">
                    <div className="min-w-0">
                      <h1 className="text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[44px]">
                        {lawyer.name}
                      </h1>
                      {lawyer.verified && (
                        <Badge variant="accent" className="mt-2.5">
                          <BadgeCheck className="size-4" aria-hidden="true" />
                          Verified by Vidhan
                        </Badge>
                      )}
                    </div>

                    <p className="flex items-center gap-1 text-[15px] text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      {districtLabel(lawyer.district)}
                    </p>

                    {typeof lawyer.yearsOfExperience === "number" && (
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-[30px] leading-none font-bold tracking-tight">
                          {lawyer.yearsOfExperience}
                        </span>
                        <span className="text-[14px] font-semibold text-muted-foreground">
                          yrs experience
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* What they do: right under the identity, no scrolling needed */}
                <ul className="flex flex-wrap gap-2">
                  {lawyer.practiceAreas.map((area) => (
                    <li key={area}>
                      <Badge variant="secondary" className="px-3 py-1 text-sm">
                        {practiceAreaLabel(area)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>

              {/* ── About ── */}
              {lawyer.bio && (
                <section className="space-y-3 border-t pt-8">
                  <h2 className="text-xl font-bold tracking-tight">About</h2>
                  <p className="max-w-prose text-[17px] leading-relaxed text-foreground/85">
                    {lawyer.bio}
                  </p>
                </section>
              )}

              {/* ── Consultation ── */}
              {(lawyer.freeFirstConsultation ||
                lawyer.consultationFee !== null ||
                (lawyer.consultationModes?.length ?? 0) > 0) && (
                <section className="space-y-4 border-t pt-8">
                  <h2 className="text-xl font-bold tracking-tight">
                    Consultation
                  </h2>
                  {lawyer.freeFirstConsultation && (
                    <Badge variant="accent" className="px-3 py-1 text-sm">
                      Free first consult
                    </Badge>
                  )}
                  {lawyer.consultationFee !== null && (
                    <p className="flex flex-wrap items-baseline gap-1.5">
                      <span className="text-[34px] leading-none font-extrabold tracking-[-0.03em] md:text-[40px]">
                        {new Intl.NumberFormat("en-NP").format(
                          lawyer.consultationFee
                        )}
                      </span>
                      <span className="text-[15px] font-semibold text-muted-foreground">
                        NPR
                      </span>
                      <span className="ms-2 text-[15px] text-muted-foreground">
                        per consultation
                      </span>
                    </p>
                  )}
                  {lawyer.consultationModes &&
                    lawyer.consultationModes.length > 0 && (
                      <ul
                        className="flex flex-wrap gap-2 pt-1"
                        aria-label="Available consultation modes"
                      >
                        {lawyer.consultationModes.map((mode) => {
                          const Icon = MODE_ICONS[mode];
                          return (
                            <li
                              key={mode}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-1.5 text-sm dark:bg-white/[0.06]"
                            >
                              <Icon className="size-4 shrink-0" aria-hidden="true" />
                              {consultationModeLabel(mode)}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </section>
              )}

              {/* ── Courts ── */}
              {lawyer.courts && lawyer.courts.length > 0 && (
                <section className="space-y-3 border-t pt-8">
                  <h2 className="text-xl font-bold tracking-tight">Courts</h2>
                  <ul className="flex flex-wrap gap-2">
                    {lawyer.courts.map((court) => (
                      <li key={court}>
                        <Badge
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {courtLabel(court)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Education & credentials ── */}
              {(lawyer.education?.length ||
                lawyer.barEnrollmentYear !== null ||
                lawyer.firmName) && (
                <section className="space-y-3 border-t pt-8">
                  <h2 className="text-xl font-bold tracking-tight">
                    Education &amp; credentials
                  </h2>
                  {lawyer.education && lawyer.education.length > 0 && (
                    <ul className="space-y-2">
                      {lawyer.education.map((entry, index) => (
                        <li key={index} className="text-[15px]">
                          <span className="font-medium">{entry.degree}</span>
                          <span className="text-foreground/80">
                            {" "}
                            — {entry.institution}
                            {entry.year ? `, ${entry.year}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {lawyer.barEnrollmentYear !== null && (
                    <p className="text-[15px] text-foreground/80">
                      Enrolled at the bar in {lawyer.barEnrollmentYear}
                    </p>
                  )}
                  {lawyer.firmName && (
                    <p className="text-[15px] text-foreground/80">
                      Practises at {lawyer.firmName}
                    </p>
                  )}
                </section>
              )}

              {/* ── Languages: one quiet line, not a full section ── */}
              {lawyer.languages.length > 0 && (
                <p className="border-t pt-8 text-[15px] text-muted-foreground">
                  Speaks {lawyer.languages.map(languageLabel).join(", ")}
                </p>
              )}
            </div>

            {/* ── Aside: the featured dark card with the booking CTA ── */}
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="space-y-6 rounded-[var(--radius)] bg-primary p-6 text-primary-foreground">
                <div className="hidden lg:block">
                  <BookButton bookingUrl={lawyer.bookingUrl} onDark />
                </div>

                <dl className="divide-y divide-primary-foreground/15">
                  {lawyer.barNumber && (
                    <InfoRow label="Bar number" value={lawyer.barNumber} onDark />
                  )}
                  {lawyer.barEnrollmentYear !== null && (
                    <InfoRow
                      label="Bar enrolled"
                      value={String(lawyer.barEnrollmentYear)}
                      onDark
                    />
                  )}
                  <InfoRow
                    label="Member since"
                    value={String(lawyer.memberSince)}
                    onDark
                  />
                </dl>
              </div>
            </aside>
          </div>

          {/* ── Related lawyers ── */}
          {related.length > 0 && (
            <section className="mt-12 space-y-4">
              <h2 className="text-xl font-bold tracking-tight">
                More {practiceAreaLabel(lawyer.practiceAreas[0]!).toLowerCase()}{" "}
                lawyers in {districtLabel(lawyer.district)}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <LawyerCard key={item.id} lawyer={item} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 py-24 text-center">
          <h1 className="text-4xl font-extrabold tracking-[-0.03em]">
            Lawyer not found
          </h1>
          <p className="text-[15px] text-muted-foreground">
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

function InfoRow({
  label,
  value,
  onDark = false,
}: {
  label: string;
  value: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt
        className={cn(
          "text-[15px]",
          onDark ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "text-right text-[15px] font-semibold",
          onDark && "text-primary-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function BookButton({
  bookingUrl,
  onDark = false,
}: {
  bookingUrl: string | null;
  onDark?: boolean;
}) {
  if (!bookingUrl) {
    return (
      <Button
        variant="outline"
        size="lg"
        className={cn(
          "w-full",
          onDark && "border-primary-foreground/40 text-primary-foreground/60"
        )}
        disabled
      >
        <Calendar />
        Booking link coming soon
      </Button>
    );
  }
  return (
    <Button
      asChild
      variant={onDark ? "outline" : "default"}
      size="lg"
      className={cn(
        "w-full",
        onDark &&
          "border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
      )}
    >
      <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
        <Calendar />
        Book a consultation
      </a>
    </Button>
  );
}