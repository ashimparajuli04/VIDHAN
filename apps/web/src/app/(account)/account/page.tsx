"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, LogOut, User } from "lucide-react";
import { DISTRICTS } from "@vidhan/schema";
import type { TDistrict } from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authErrorMessage } from "@/features/auth/api";
import { useAuth } from "@/features/auth/provider";
import { districtLabel } from "@/features/lawyers/labels";
import { PlanCards } from "@/features/plans/components/plan-cards";
import type { TPlanId } from "@/features/plans/plans";
import { getUsage } from "@/features/usage/api";
import { UsageMeter } from "@/features/usage/components/usage-meter";
import { getMembership } from "@/features/enterprise/api";
import { cn } from "@/lib/utils";

const DISTRICT_NONE = "__none__";

type TMode = "general" | "research";

const MODES: { value: TMode; label: string }[] = [
  { value: "general", label: "General" },
  { value: "research", label: "Research" },
];

type TTab = "profile" | "plan";

const TABS: { value: TTab; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "plan", label: "Plan" },
];

export default function AccountPage() {
  const { user, update, logout } = useAuth();
  const router = useRouter();

  const [tab, setTab] = React.useState<TTab>("profile");
  const [name, setName] = React.useState(user?.name ?? "");
  const [district, setDistrict] = React.useState<TDistrict | null>(
    user?.district ?? null
  );
  const [mode, setMode] = React.useState<TMode>(
    user?.isResearcher ? "research" : "general"
  );
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = React.useState<TPlanId | null>(null);

  // The public user omits plan state (sprint-9: usage owns that), so the
  // current-plan highlight reads it from the usage meter instead. An
  // Enterprise membership wins over both individual plans.
  React.useEffect(() => {
    let active = true;
    getUsage()
      .then((usage) => {
        if (!active) return;
        setCurrentPlan(usage.isSubscribed ? "subscribed" : "free");
      })
      .catch(() => {
        // Non-critical: leave the highlight off rather than guess.
      });
    getMembership()
      .then((membership) => {
        if (active && membership) setCurrentPlan("enterprise");
      })
      .catch(() => {
        // Non-critical: membership only upgrades the highlight.
      });
    return () => {
      active = false;
    };
  }, []);

  const cleanName = name.trim();
  const dirty =
    cleanName !== (user?.name ?? "") ||
    district !== (user?.district ?? null) ||
    mode !== (user?.isResearcher ? "research" : "general");
  const canSave = cleanName.length > 0 && dirty && !saving;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await update({
        name: cleanName,
        district,
        isResearcher: mode === "research",
      });
      setName(cleanName);
      setSaved(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/chat");
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-6">
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={goBack}
          className="-ml-2 gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <header className="mt-6 flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="size-7 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {user?.name ?? "Account"}
          </h1>
          <p className="truncate text-[15px] text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Account sections"
        className="mt-8 flex w-full gap-1 rounded-lg border border-border bg-muted p-1"
      >
        {TABS.map((option) => (
          <button
            key={option.value}
            id={`tab-${option.value}`}
            role="tab"
            type="button"
            aria-selected={tab === option.value}
            aria-controls={`panel-${option.value}`}
            onClick={() => setTab(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md px-3 py-2 text-[15px] font-medium transition-colors",
              tab === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div
          role="tabpanel"
          id="panel-profile"
          aria-labelledby="tab-profile"
        >
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
              <CardDescription>
                Changes apply immediately to your account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSave} noValidate className="grid gap-6">
                <Field>
                  <FieldTitle>Name</FieldTitle>
                  <FieldContent>
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      placeholder="Aasha Thapa"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldTitle>Place</FieldTitle>
                  <FieldContent>
                    <Select
                      value={district ?? DISTRICT_NONE}
                      onValueChange={(value) =>
                        setDistrict(
                          value === DISTRICT_NONE ? null : (value as TDistrict)
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your district" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-72">
                        <SelectItem value={DISTRICT_NONE}>
                          Prefer not to say
                        </SelectItem>
                        {DISTRICTS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {districtLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Your district. Select “Prefer not to say” to remove it.
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldTitle>Default mode of use</FieldTitle>
                  <FieldContent>
                    <div className="flex w-full gap-1 rounded-lg border border-border bg-muted p-1">
                      {MODES.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={mode === option.value}
                          onClick={() => setMode(option.value)}
                          className={cn(
                            "flex flex-1 items-center justify-center rounded-md px-3 py-2 text-[15px] font-medium transition-colors",
                            mode === option.value
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <FieldDescription>
                      New chats start in this mode. You can still change the
                      chat type later.
                    </FieldDescription>
                  </FieldContent>
                </Field>

                {saved && (
                  <p className="flex items-center gap-1.5 text-[15px] font-medium text-emerald-600 dark:text-emerald-500">
                    <CheckCircle2 className="size-4" />
                    Changes saved.
                  </p>
                )}

                {!saved && error && (
                  <p role="alert" className="text-[15px] text-destructive">
                    {error}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={!canSave}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      )}

      {tab === "plan" && (
        <div role="tabpanel" id="panel-plan" aria-labelledby="tab-plan">
          <section className="mt-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight">Plans</h2>
              <p className="text-[15px] text-muted-foreground">
                Three ways to access Vidhan — from individual use to
                organization-wide access.
              </p>
            </div>
            <div className="mt-5">
              <PlanCards currentPlan={currentPlan} />
            </div>
          </section>

          <section className="mt-10">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight">Usage</h2>
              <p className="text-[15px] text-muted-foreground">
                Your token usage for today. It resets every midnight in Nepal.
              </p>
            </div>
            <div className="mt-5">
              <UsageMeter />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
