"use client";

import { Clock } from "lucide-react";
import Link from "next/link";

import type { TPublicLawyer } from "@vidhan/schema";

import { PigAvatar } from "@/components/lawyers/pig-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { districtLabel, practiceAreaLabel } from "@/features/lawyers/labels";

export function LawyerResultCard({ lawyer }: { lawyer: TPublicLawyer }) {
  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex h-full flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-5 text-left transition-colors hover:border-foreground/15">
          <div className="flex items-center gap-3">
            {lawyer.imageUrl ? (
              // next/image isn't configured for remote hosts under static export.
              <img
                src={lawyer.imageUrl}
                alt={lawyer.name}
                loading="lazy"
                className="size-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <PigAvatar name={lawyer.name} className="size-12 shrink-0" />
            )}

            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{lawyer.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                <Clock className="size-3.5" />
                {typeof lawyer.yearsOfExperience === "number"
                  ? `${lawyer.yearsOfExperience} yrs experience`
                  : "Experience not listed"}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="mt-auto w-full">
            <Link href={`/lawyers/${lawyer.id}`}>View profile</Link>
          </Button>
        </div>
      </HoverCardTrigger>

      <HoverCardContent align="start" className="w-80 space-y-3">
        <div>
          <p className="text-[15px] font-semibold">{lawyer.name}</p>
          <p className="text-[13px] text-muted-foreground">
            {districtLabel(lawyer.district)}
          </p>
        </div>

        {lawyer.bio && (
          <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
            {lawyer.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {lawyer.practiceAreas.map((area) => (
            <Badge key={area} variant="secondary">
              {practiceAreaLabel(area)}
            </Badge>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
