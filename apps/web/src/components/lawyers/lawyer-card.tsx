import { ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";

import type { TPublicLawyer } from "@vidhan/schema";

import { PigAvatar } from "@/components/lawyers/pig-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  districtLabel,
  languageLabel,
  practiceAreaLabel,
} from "@/features/lawyers/labels";

const MAX_PRACTICE_AREAS = 3;
const MAX_LANGUAGES = 2;

export function LawyerCard({ lawyer }: { lawyer: TPublicLawyer }) {
  const visibleAreas = lawyer.practiceAreas.slice(0, MAX_PRACTICE_AREAS);
  const hiddenAreaCount = lawyer.practiceAreas.length - visibleAreas.length;

  const visibleLanguages = lawyer.languages.slice(0, MAX_LANGUAGES);
  const hiddenLanguageCount = lawyer.languages.length - visibleLanguages.length;

  const hasStats =
    typeof lawyer.yearsOfExperience === "number" ||
    lawyer.consultationFee !== null ||
    lawyer.freeFirstConsultation;

  return (
    <Card className="group relative mx-auto h-full w-full max-w-[470px] transition-colors hover:border-foreground/15">
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <PigAvatar
            name={lawyer.name}
            className="size-14 shrink-0"
          />

          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-2 text-[17px]">
              {/* Stretched link: the whole card is clickable */}
              <Link
                href={`/lawyers/${lawyer.id}`}
                className="min-w-0 truncate after:absolute after:inset-0 focus-visible:outline-none"
              >
                {lawyer.name}
              </Link>
              {lawyer.verified && (
                <Badge
                  variant="accent"
                  className="shrink-0 gap-1 px-2 py-0.5 text-[11px] font-semibold"
                  title="Verified by Vidhan"
                >
                  <BadgeCheck className="size-3" aria-hidden="true" />
                  Verified
                </Badge>
              )}
            </CardTitle>

            <CardDescription className="mt-1 flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{districtLabel(lawyer.district)}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {visibleAreas.map((area) => (
            <Badge key={area} variant="secondary" className="text-sm">
              {practiceAreaLabel(area)}
            </Badge>
          ))}
          {hiddenAreaCount > 0 && (
            <Badge
              variant="secondary"
              className="text-sm text-muted-foreground"
            >
              +{hiddenAreaCount}
            </Badge>
          )}
        </div>

        {hasStats && (
          <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-background/70 p-4">
            {typeof lawyer.yearsOfExperience === "number" && (
              <div>
                <dd className="text-[24px] leading-none font-bold tracking-tight">
                  {lawyer.yearsOfExperience}
                  <span className="ms-1.5 text-[13px] font-semibold text-muted-foreground">
                    yrs
                  </span>
                </dd>
                <dt className="mt-1.5 text-[13px] text-muted-foreground">
                  experience
                </dt>
              </div>
            )}

            {(lawyer.freeFirstConsultation || lawyer.consultationFee !== null) && (
              <div>
                <dd className="text-[24px] leading-none font-bold tracking-tight">
                  {lawyer.freeFirstConsultation ? (
                    "Free"
                  ) : (
                    <>
                      {new Intl.NumberFormat("en-NP").format(
                        lawyer.consultationFee ?? 0
                      )}
                      <span className="ms-1.5 text-[13px] font-semibold text-muted-foreground">
                        NPR
                      </span>
                    </>
                  )}
                </dd>
                <dt className="mt-1.5 text-[13px] text-muted-foreground">
                  {lawyer.freeFirstConsultation
                    ? "first consult"
                    : "from, per consult"}
                </dt>
              </div>
            )}
          </dl>
        )}

        {visibleLanguages.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            {visibleLanguages.map(languageLabel).join(", ")}
            {hiddenLanguageCount > 0 && ` +${hiddenLanguageCount}`}
          </p>
        )}

        {lawyer.bio && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {lawyer.bio}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors group-hover:text-foreground">
          View profile
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </CardFooter>
    </Card>
  );
}