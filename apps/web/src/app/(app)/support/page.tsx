"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { SupportList } from "@/features/support/components/support-list";
import { SupportThread } from "@/features/support/components/support-thread";

export default function SupportPage() {
  return (
    <React.Suspense fallback={null}>
      <SupportContent />
    </React.Suspense>
  );
}

// Detail is a query param (/support?id=...) rather than a dynamic segment:
// the site is a static export, so /support/[id] cannot enumerate the runtime
// ticket ids. Mirrors the chat route's ?id= shape.
function SupportContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-5 pb-16 md:px-8 md:pt-7">
      {id ? (
        <SupportThread id={id} />
      ) : (
        <>
          <header className="mb-8 md:mb-10">
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] md:text-[44px] md:leading-[1.05]">
              Support
            </h1>
            <p className="mt-3 max-w-2xl text-[17px] leading-snug text-muted-foreground">
              Report a missing document, a missing lawyer, or anything else.
              An admin replies here.
            </p>
          </header>

          <SupportList />
        </>
      )}
    </main>
  );
}
