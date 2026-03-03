/** Tiny cookie helpers (browser-only). */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${encodeURIComponent(name)}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()!.split(";").shift()!);
  }
  return undefined;
}

export function setCookie(
  name: string,
  value: string,
  options: { days?: number; path?: string; sameSite?: "Lax" | "Strict" | "None" } = {}
) {
  if (typeof document === "undefined") return;

  const { days = 365, path = "/", sameSite = "Lax" } = options;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=${path}; samesite=${sameSite}`;
}
