"use client";

import * as React from "react";
import { CONSULTATION_MODES } from "@vidhan/schema";
import type { TConsultationMode } from "@vidhan/schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultationModeLabel } from "@/features/lawyers/labels";
import { createLawyerRequest } from "@/features/lawyers/requests-api";

const NO_MODE = "none";
type TModeChoice = TConsultationMode | typeof NO_MODE;

export function RequestCallDialog({
  lawyerId,
  lawyerName,
  trigger,
}: {
  lawyerId: string;
  lawyerName: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("");
  const [mode, setMode] = React.useState<TModeChoice>(NO_MODE);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPhone("");
      setPreferredTime("");
      setMode(NO_MODE);
      setNote("");
      setSubmitting(false);
      setError(null);
      setDone(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone.trim() || !preferredTime.trim()) {
      setError("Phone and preferred time are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createLawyerRequest({
        lawyerId,
        phone: phone.trim(),
        preferredTime: preferredTime.trim(),
        mode: mode === NO_MODE ? null : mode,
        note: note.trim() || null,
      });
      setDone(true);
    } catch {
      setError("Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Request sent</DialogTitle>
              <DialogDescription>
                We&apos;ll arrange a callback with {lawyerName} and update the
                status on your requests page.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Request a call</DialogTitle>
              <DialogDescription>
                Tell us how to reach you. Vidhan arranges the consultation with{" "}
                {lawyerName}.
              </DialogDescription>
            </DialogHeader>

            <Field>
              <FieldLabel htmlFor="request-phone">Phone</FieldLabel>
              <Input
                id="request-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="98XXXXXXXX"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="request-time">Preferred time</FieldLabel>
              <Input
                id="request-time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                placeholder="Tomorrow evening"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="request-mode">
                Preferred mode (optional)
              </FieldLabel>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as TModeChoice)}
              >
                <SelectTrigger id="request-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MODE}>No preference</SelectItem>
                  {CONSULTATION_MODES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {consultationModeLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="request-note">Note (optional)</FieldLabel>
              <Textarea
                id="request-note"
                rows={3}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Briefly, what is this about?"
              />
            </Field>

            {error && <FieldError>{error}</FieldError>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send request"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
