/**
 * Path prefix when the site is served from a sub-folder, e.g. "/bookshelf" on GitHub Pages
 * (https://<user>.github.io/bookshelf/). Empty when served from the domain root.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** Absolute URL to a page of this site, e.g. siteUrl("/login/"). Browser only. */
export const siteUrl = (path = "/") => `${window.location.origin}${BASE_PATH}${path}`;
