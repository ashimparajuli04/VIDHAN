import Link from "next/link";

export default function TermsPage() {
  return (
    <article className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 text-sm text-card-foreground shadow-sm md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-muted-foreground">
        Last updated 2 October 2026.
      </p>

      <div className="mt-6 space-y-5 leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            1. What Vidhan is
          </h2>
          <p>
            Vidhan provides general legal information for people in Nepal and
            helps you find a lawyer. It is not a law firm and does not create an
            advocate–client relationship. Responses are generated automatically
            and may be incomplete or out of date.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            2. Not legal advice
          </h2>
          <p>
            Information from Vidhan is for general guidance only. For advice
            about your situation, consult a licensed advocate. Do not rely on a
            chat response for a court deadline, filing, or binding decision.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            3. Your account
          </h2>
          <p>
            Keep your password private and provide accurate details. You are
            responsible for activity under your account. Do not use Vidhan to
            break the law, harass others, or submit content you have no right to
            share.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            4. Lawyer listings
          </h2>
          <p>
            Lawyer profiles are provided for information. We do not guarantee
            the accuracy of a profile, and any engagement you make with a lawyer
            is between you and them.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            5. Changes
          </h2>
          <p>
            We may update these terms as the service changes. Continued use
            after an update means you accept the revised terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            6. Contact
          </h2>
          <p>
            Questions about these terms can be sent to{" "}
            <span className="text-foreground">support@vidhan.app</span>.
          </p>
        </section>
      </div>

      <p className="mt-8 text-muted-foreground">
        See also our{" "}
        <Link
          href="/privacy"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </article>
  );
}
