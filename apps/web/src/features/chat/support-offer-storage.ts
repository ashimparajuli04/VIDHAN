import type { TSupportOffer } from "./types";

const PREFIX = "vidhan:support-offer-dismissed:";

/**
 * Dismissals key on the offer itself: the card is re-derived from the
 * assistant's persisted tool call on every load, and a live turn's message id
 * differs from its DB row id after a reload.
 */
export function supportOfferKey(offer: TSupportOffer): string {
  return `${PREFIX}${offer.category}:${offer.message}`;
}

export function isOfferDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

export function dismissOffer(key: string): void {
  window.localStorage.setItem(key, "1");
}
