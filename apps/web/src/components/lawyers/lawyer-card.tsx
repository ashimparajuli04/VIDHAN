import { ArrowRight, MapPin } from "lucide-react";

import type { TPublicLawyer } from "@vidhan/schema";

import { PigAvatar } from "@/components/lawyers/pig-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { districtLabel, practiceAreaLabel } from "@/features/lawyers/labels";

// Keep the card scannable: surface only a small number of practice areas.
// The rest lives on the lawyer's detail page.
const MAX_PRACTICE_AREAS = 3;

export function LawyerCard({ lawyer }: { lawyer: TPublicLawyer }) {
  const visibleAreas = lawyer.practiceAreas.slice(0, MAX_PRACTICE_AREAS);
  const hiddenAreaCount =
    lawyer.practiceAreas.length - visibleAreas.length;

  return (
    <Card
      className={cn(
        "h-full transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-sm"
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PigAvatar name={lawyer.name} className="size-12 shrink-0" />

          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
              <span className="truncate">{lawyer.name}</span>
            </CardTitle>

            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {districtLabel(lawyer.district)}
              </span>
              {typeof lawyer.yearsOfExperience === "number" && (
                <span>· {lawyer.yearsOfExperience} yrs experience</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {visibleAreas.map((area) => (
            <Badge key={area} variant="secondary">
              {practiceAreaLabel(area)}
            </Badge>
          ))}
          {hiddenAreaCount > 0 && (
            <Badge variant="secondary" className="text-muted-foreground">
              +{hiddenAreaCount}
            </Badge>
          )}
        </div>

        {lawyer.bio && (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {lawyer.bio}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto">
        {lawyer.bookingUrl ? (
          <Button asChild className="w-full">
            <a
              href={lawyer.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book consultation
              <ArrowRight />
            </a>
          </Button>
        ) : (
          <p className="w-full text-center text-sm text-muted-foreground">
            Booking coming soon
          </p>
        )}
      </CardFooter>
    </Card>
  );
}