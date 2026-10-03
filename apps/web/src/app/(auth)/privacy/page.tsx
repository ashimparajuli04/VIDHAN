import Link from "next/link";

export default function PrivacyPage() {
  return (
    <article className="w-full max-w-2xl rounded-[var(--radius)] border border-border bg-card p-7 text-[15px] text-card-foreground md:p-8">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Privacy Policy</h1>
      <p className="mt-2 text-muted-foreground">
        Last updated 2 October 2026.
      </p>

      <div className="mt-6 space-y-5 leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            1. What we collect
          </h2>
          <p>
            When you create an account we store your name, email, optional
            district, and whether you identify as a researcher. We also store
            the chats you start, including the messages you send, so you can
            return to them.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            2. How we use it
          </h2>
          <p>
            We use your details to run your account and to tailor responses. We
            use chat content to generate answers and to keep your history.
            Aggregate, non-identifying usage helps us improve the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            3. Sharing
          </h2>
          <p>
            We do not sell your personal data. We share it only with service
            providers that host the app and process requests on our behalf, or
            where the law requires it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            4. Security
          </h2>
          <p>
            Passwords are stored as salted hashes. Sessions use a token kept in
            your browser. No system is perfectly secure, so please avoid
            sharing sensitive documents or numbers in chat.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            5. Your choices
          </h2>
          <p>
            You can delete individual chats from your account. To delete your
            account and its data, email{" "}
            <span className="text-foreground">support@vidhan.app</span>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">
            6. Changes
          </h2>
          <p>
            If this policy changes in a meaningful way, we will note the new
            date above and, where appropriate, tell you in the app.
          </p>
        </section>
      </div>

      <p className="mt-8 text-muted-foreground">
        See also our{" "}
        <Link
          href="/terms"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Terms of Service
        </Link>
        .
      </p>
    </article>
  );
}
