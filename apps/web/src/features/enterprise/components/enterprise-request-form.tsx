"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { ENTERPRISE_CAPABILITIES } from "@vidhan/schema";
import type {
  TEnterpriseCapability,
  TEnterpriseContactMethod,
  TEnterpriseRequest,
  TEnterpriseRequestCreate,
} from "@vidhan/schema";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { createEnterpriseRequest, EnterpriseApiError } from "../api";
import { capabilityLabel, contactMethodLabel } from "../labels";

const CAPABILITY_OPTIONS: TEnterpriseCapability[] = [
  ...ENTERPRISE_CAPABILITIES,
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h3 className="text-[17px] font-bold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function EnterpriseRequestForm({
  onCreated,
}: {
  onCreated: (request: TEnterpriseRequest) => void;
}) {
  const [organizationName, setOrganizationName] = React.useState("");
  const [organizationType, setOrganizationType] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [employeeCount, setEmployeeCount] = React.useState("");

  const [contactName, setContactName] = React.useState("");
  const [contactTitle, setContactTitle] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactMethod, setContactMethod] =
    React.useState<TEnterpriseContactMethod>("email");

  const [expectedUsers, setExpectedUsers] = React.useState("");
  const [expectedUsage, setExpectedUsage] = React.useState("");
  const [teamsDepartments, setTeamsDepartments] = React.useState("");
  const [intendedUse, setIntendedUse] = React.useState("");
  const [expectedStartDate, setExpectedStartDate] = React.useState("");

  const [capabilities, setCapabilities] = React.useState<TEnterpriseCapability[]>(
    [],
  );
  const [additionalRequirements, setAdditionalRequirements] =
    React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function toggleCapability(capability: TEnterpriseCapability) {
    setCapabilities((current) =>
      current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability]
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (capabilities.length === 0) {
      setError("Select at least one capability you are looking for.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const input: TEnterpriseRequestCreate = {
      organizationName: organizationName.trim(),
      organizationType: organizationType.trim(),
      industry: industry.trim(),
      website: website.trim(),
      country: country.trim(),
      city: city.trim(),
      employeeCount: employeeCount.trim(),
      contactName: contactName.trim(),
      contactTitle: contactTitle.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      preferredContactMethod: contactMethod,
      expectedUsers: Number(expectedUsers),
      expectedUsage: expectedUsage.trim(),
      teamsDepartments: teamsDepartments.trim(),
      intendedUse: intendedUse.trim(),
      expectedStartDate: expectedStartDate.trim(),
      requestedCapabilities: capabilities,
      additionalRequirements: additionalRequirements.trim(),
    };
    try {
      const request = await createEnterpriseRequest(input);
      onCreated(request);
    } catch (cause) {
      setError(
        cause instanceof EnterpriseApiError && cause.status === 0
          ? "Could not reach the server. Try again."
          : "Could not submit the request. Check the form and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-10">
      <Section title="Organization">
        <FieldGrid>
          <Field>
            <FieldTitle>Organization / institution name</FieldTitle>
            <FieldContent>
              <Input
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder="ABC Bank"
                maxLength={160}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Organization type</FieldTitle>
            <FieldContent>
              <Input
                value={organizationType}
                onChange={(event) => setOrganizationType(event.target.value)}
                placeholder="Bank, law firm, NGO…"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Industry / sector</FieldTitle>
            <FieldContent>
              <Input
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                placeholder="Banking, legal services…"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Website</FieldTitle>
            <FieldContent>
              <Input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://…"
                inputMode="url"
                maxLength={200}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Country</FieldTitle>
            <FieldContent>
              <Input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Nepal"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>City / location</FieldTitle>
            <FieldContent>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Kathmandu"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Approximate employee count</FieldTitle>
            <FieldContent>
              <Input
                value={employeeCount}
                onChange={(event) => setEmployeeCount(event.target.value)}
                placeholder="50–200"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>
        </FieldGrid>
      </Section>

      <Section title="Contact">
        <FieldGrid>
          <Field>
            <FieldTitle>Contact person's name</FieldTitle>
            <FieldContent>
              <Input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Ram Sharma"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Job title / role</FieldTitle>
            <FieldContent>
              <Input
                value={contactTitle}
                onChange={(event) => setContactTitle(event.target.value)}
                placeholder="Head of Legal"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Work email</FieldTitle>
            <FieldContent>
              <Input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="ram@abcbank.com"
                type="email"
                autoComplete="email"
                maxLength={200}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Phone number</FieldTitle>
            <FieldContent>
              <Input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="+977 98…"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Preferred contact method</FieldTitle>
            <FieldContent>
              <Select
                value={contactMethod}
                onValueChange={(value) =>
                  setContactMethod(value as TEnterpriseContactMethod)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(["email", "phone"] as const).map((method) => (
                    <SelectItem key={method} value={method}>
                      {contactMethodLabel(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </FieldGrid>
      </Section>

      <Section title="Vidhan usage">
        <FieldGrid>
          <Field>
            <FieldTitle>Expected number of Vidhan users</FieldTitle>
            <FieldContent>
              <Input
                value={expectedUsers}
                onChange={(event) => setExpectedUsers(event.target.value)}
                placeholder="25"
                type="number"
                min={1}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Expected start date</FieldTitle>
            <FieldContent>
              <Input
                value={expectedStartDate}
                onChange={(event) => setExpectedStartDate(event.target.value)}
                placeholder="As soon as possible, or a date…"
                maxLength={120}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Expected usage</FieldTitle>
            <FieldContent>
              <Textarea
                value={expectedUsage}
                onChange={(event) => setExpectedUsage(event.target.value)}
                placeholder="Daily legal research, case law lookup, document review…"
                rows={3}
                maxLength={1000}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Teams / departments that will use Vidhan</FieldTitle>
            <FieldContent>
              <Textarea
                value={teamsDepartments}
                onChange={(event) => setTeamsDepartments(event.target.value)}
                placeholder="Legal department, compliance, risk…"
                rows={3}
                maxLength={500}
                required
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldTitle>Intended use</FieldTitle>
            <FieldContent>
              <Textarea
                value={intendedUse}
                onChange={(event) => setIntendedUse(event.target.value)}
                placeholder="What does your organization want to accomplish with Vidhan?"
                rows={3}
                maxLength={1000}
                required
              />
            </FieldContent>
          </Field>
        </FieldGrid>
      </Section>

      <Section title="Requested capabilities">
        <div className="flex flex-wrap gap-2">
          {CAPABILITY_OPTIONS.map((capability) => {
            const selected = capabilities.includes(capability);
            return (
              <button
                key={capability}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCapability(capability)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-medium transition-colors",
                  selected
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {selected && <Check className="size-3.5" />}
                {capabilityLabel(capability)}
              </button>
            );
          })}
        </div>
        <FieldDescription>
          The Vidhan team reviews these requirements — selecting them does not
          guarantee they are available.
        </FieldDescription>
      </Section>

      <Section title="Additional requirements">
        <Field>
          <FieldTitle>Anything else we should know?</FieldTitle>
          <FieldContent>
            <Textarea
              value={additionalRequirements}
              onChange={(event) =>
                setAdditionalRequirements(event.target.value)
              }
              placeholder="Optional — security policies, deployment constraints, timelines…"
              rows={4}
              maxLength={4000}
            />
          </FieldContent>
        </Field>
      </Section>

      {error && <p className="text-[15px] text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Request Enterprise"}
        </Button>
        <p className="text-[14px] text-muted-foreground">
          A Vidhan team member will review it and reply in your Support
          conversation.
        </p>
      </div>
    </form>
  );
}