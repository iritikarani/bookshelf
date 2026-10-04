import { siteUrl } from "./basePath";

/**
 * The words and link sent along with any image shared from the site, so whoever receives it can
 * find the shelf (or make their own). The link is inside the text too: many apps keep the text
 * of a share but drop its separate link when an image is attached.
 */
export function shareMessage(opts: { publicUrl?: string | null; visitorOf?: string | null }): { text: string; url: string } {
  const { publicUrl, visitorOf } = opts;
  if (visitorOf !== undefined) {
    const url = publicUrl || siteUrl("/");
    return { url, text: `📚 From ${visitorOf ? `${visitorOf}’s` : "a"} bookshelf on Cosmic Space. Have a look, and make your own!\n${url}` };
  }
  if (publicUrl) return { url: publicUrl, text: `📚 This is my bookshelf on Cosmic Space. Come have a look, and create yours!\n${publicUrl}` };
  const url = siteUrl("/");
  return { url, text: `📚 Make your own cosy bookshelf on Cosmic Space!\n${url}` };
}

/** Share image files with the message; if files can't be shared, share the message alone. */
export async function shareFiles(files: File[], msg: { text: string; url: string }, title: string): Promise<"shared" | "unsupported"> {
  if (navigator.canShare?.({ files })) {
    await navigator.share({ files, title, text: msg.text });
    return "shared";
  }
  if ("share" in navigator) {
    await navigator.share({ title, text: msg.text, url: msg.url });
    return "shared";
  }
  return "unsupported";
}
