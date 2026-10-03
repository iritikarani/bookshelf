/**
 * Cosmic Space builds to plain static files (`out/`), so it can be hosted anywhere:
 * GitHub Pages, Vercel, Netlify, Cloudflare Pages, or any web server.
 * Set NEXT_PUBLIC_BASE_PATH when serving from a sub-folder (e.g. "/bookshelf" on GitHub Pages).
 */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
