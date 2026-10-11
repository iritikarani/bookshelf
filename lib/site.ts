/** The site's public address and name, for search engines and link previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.selfshelf.in").replace(/\/$/, "");
export const SITE_NAME = "SelfShelf";
export const SITE_TAGLINE = "Virtual Bookshelf & Reading Tracker";
export const SITE_DESCRIPTION =
  "Build a beautiful virtual bookshelf of the books you love. Track your reading, set a yearly goal, save quotes and keep a journal for every book. Free and private by default.";

/** Guides: plain pages that answer readers' questions (listed in the sitemap and footer). */
export const GUIDES = [
  { path: "/virtual-bookshelf/", title: "How to make a virtual bookshelf" },
  { path: "/reading-tracker/", title: "Track the books you read" },
  { path: "/import-goodreads/", title: "Move your Goodreads library" },
  { path: "/faq/", title: "Questions and answers" },
] as const;
