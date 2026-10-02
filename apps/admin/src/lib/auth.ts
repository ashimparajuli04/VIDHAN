const KEY = "vidhan.admin.basic";

function storage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

// btoa takes Latin-1; round-trip UTF-8 so non-ASCII passwords survive.
function encode(user: string, pass: string): string {
  const bytes = new TextEncoder().encode(`${user}:${pass}`);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function hasCreds(): boolean {
  return storage()?.getItem(KEY) != null;
}

export function getAuthHeader(): string | null {
  const stored = storage()?.getItem(KEY);
  return stored ? `Basic ${stored}` : null;
}

export function setCreds(user: string, pass: string): void {
  storage()?.setItem(KEY, encode(user, pass));
}

export function clearCreds(): void {
  storage()?.removeItem(KEY);
}
