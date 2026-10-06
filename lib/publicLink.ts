import { siteUrl } from "./basePath";
import type { Profile } from "./types";

/** The path of a public shelf: /s/@username when there is one, else the private random link. */
export function publicPath(p: Pick<Profile, "username" | "public_slug">): string {
  return p.username ? `/s/@${p.username}` : `/s/?u=${encodeURIComponent(p.public_slug)}`;
}

/** The full public link, or null when the shelf is private (or before the page has loaded). */
export function publicUrlOf(p: Pick<Profile, "username" | "public_slug" | "is_public"> | null | undefined): string | null {
  if (!p?.is_public || typeof window === "undefined") return null;
  return siteUrl(publicPath(p));
}

/**
 * Which shelf a /s/ page shows: "/s/@ritika" (rewritten to /s/ on the host) or "/s/?u=@ritika"
 * or the older "/s/?u=<random>" links, which keep working.
 */
export function slugFromLocation(search: string, pathname: string): string {
  const fromPath = decodeURIComponent(pathname).match(/\/s\/(@[a-z0-9_.]{3,20})\/?$/i)?.[1];
  const q = new URLSearchParams(search).get("u") ?? "";
  const slug = (fromPath ?? q).trim();
  // Usernames are lowercase; the random links are case-sensitive hex, so leave those alone.
  return slug.startsWith("@") ? slug.toLowerCase() : slug;
}
