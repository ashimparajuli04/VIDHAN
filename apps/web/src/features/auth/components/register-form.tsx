"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { DISTRICTS } from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { authErrorMessage } from "@/features/auth/api";
import { useAuth } from "@/features/auth/provider";
import {
  ZRegisterForm,
  type TRegisterFormInput,
  type TRegisterFormOutput,
} from "@/features/auth/schemas";
import { districtLabel } from "@/features/lawyers/labels";

const DISTRICT_NONE = "__none__";

const STEP_TITLES = ["Account", "Profile", "Terms"] as const;

const STEP_FIELDS: (keyof TRegisterFormInput)[][] = [
  ["name", "email", "password", "confirmPassword"],
  ["district", "isResearcher"],
  [],
];

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [accepted, setAccepted] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const form = useForm<TRegisterFormInput, unknown, TRegisterFormOutput>({
    resolver: standardSchemaResolver(ZRegisterForm),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      district: null,
      isResearcher: false,
    },
    mode: "onTouched",
  });

  async function goNext() {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (valid) setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!accepted) return;
    setFormError(null);
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
        district: values.district,
        isResearcher: values.isResearcher,
      });
      router.replace("/chat");
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <div className="w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-7 text-card-foreground">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
          Create your account
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Step {step + 1} of {STEP_TITLES.length} — {STEP_TITLES[step]}
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
          {step === 0 && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="name"
                        placeholder="Aasha Thapa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="size-5" />
                          ) : (
                            <Eye className="size-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((value) => !value)}
                          aria-label={
                            showConfirm ? "Hide password" : "Show password"
                          }
                          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showConfirm ? (
                            <EyeOff className="size-5" />
                          ) : (
                            <Eye className="size-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {step === 1 && (
            <>
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <Select
                      value={field.value ?? DISTRICT_NONE}
                      onValueChange={(value) =>
                        field.onChange(value === DISTRICT_NONE ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select your district" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="max-h-72">
                        <SelectItem value={DISTRICT_NONE}>
                          Prefer not to say
                        </SelectItem>
                        {DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {districtLabel(district)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isResearcher"
                render={({ field }) => (
                  <Field
                    orientation="horizontal"
                    className="items-start rounded-lg border border-border p-3"
                  >
                    <FieldContent>
                      <FieldTitle>I&apos;m a researcher</FieldTitle>
                      <FieldDescription>
                        New chats start in research mode. You can still change
                        the chat type later.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </Field>
                )}
              />
            </>
          )}

          {step === 2 && (
            <label className="flex items-start gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 size-5 shrink-0 rounded border-input accent-primary"
              />
              <span className="text-muted-foreground">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          )}

          {formError && (
            <p role="alert" className="text-[15px] text-destructive">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                className="flex-1"
              >
                Back
              </Button>
            )}

            {step < STEP_TITLES.length - 1 ? (
              <Button type="button" onClick={goNext} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!accepted || form.formState.isSubmitting}
                className="flex-1"
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="animate-spin" />
                )}
                Create account
              </Button>
            )}
          </div>
        </form>
      </Form>

      <p className="mt-6 text-center text-[15px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
