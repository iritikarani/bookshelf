/**
 * Cosmic Space's book-catalogue helper (a Vercel Function at /api/catalog).
 *
 * Phones ask this instead of Open Library / Google Books directly, so Discover and search work
 * even when a phone's network can't reach the catalogues, a browser blocks the request, or a
 * catalogue is slow. Answers are kept on Vercel's CDN for a day (and served stale for a week
 * while refreshing), so most visits never wait on a catalogue at all.
 *
 * It only forwards the few requests the site makes (book search, a work's description, Google
 * Books search), never arbitrary URLs. An optional GOOGLE_BOOKS_KEY environment variable gives
 * Google Books requests their own quota; it stays on the server and is never sent to browsers.
 */

const SORTS = new Set(["trending", "currently_reading", "readinglog", "rating", "want_to_read", "new"]);
const SEARCH_KEYS = ["q", "title", "author", "publisher", "fields", "sort", "limit"];
const UA = "CosmicSpace/1.0 (personal bookshelf; https://bookshelf-three-woad.vercel.app)";

const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

function target(params) {
  const kind = params.get("kind");
  if (kind === "search") {
    const out = new URLSearchParams();
    for (const k of SEARCH_KEYS) {
      const v = params.get(k);
      if (!v) continue;
      if (k === "sort" && !SORTS.has(v)) continue;
      if (k === "limit") out.set(k, String(Math.min(Math.max(parseInt(v, 10) || 20, 1), 40)));
      else if (k === "fields") out.set(k, clip(v.replace(/[^a-z_,]/g, ""), 300));
      else out.set(k, clip(v, 200));
    }
    if (!out.get("q") && !out.get("title") && !out.get("author") && !out.get("publisher")) return null;
    return `https://openlibrary.org/search.json?${out}`;
  }
  if (kind === "work") {
    const key = params.get("key") || "";
    return /^\/works\/OL\d+W$/.test(key) ? `https://openlibrary.org${key}.json` : null;
  }
  if (kind === "google") {
    const q = clip(params.get("q"), 200);
    if (!q) return null;
    const key = process.env.GOOGLE_BOOKS_KEY;
    return `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=30&printType=books${key ? `&key=${encodeURIComponent(key)}` : ""}`;
  }
  return null;
}

module.exports = async function handler(req, res) {
  const params = new URL(req.url, "http://localhost").searchParams;
  const url = target(params);
  if (!url) {
    res.statusCode = 400;
    res.setHeader("Cache-Control", "no-store");
    return res.end(JSON.stringify({ error: "Unsupported request" }));
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const upstream = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "application/json" } });
    const body = await upstream.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (!upstream.ok) {
      res.statusCode = 502;
      res.setHeader("Cache-Control", "no-store");
      return res.end(JSON.stringify({ error: `Catalogue answered ${upstream.status}` }));
    }
    res.statusCode = 200;
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    return res.end(body);
  } catch {
    res.statusCode = 504;
    res.setHeader("Cache-Control", "no-store");
    return res.end(JSON.stringify({ error: "Catalogue did not answer in time" }));
  } finally {
    clearTimeout(timer);
  }
};
