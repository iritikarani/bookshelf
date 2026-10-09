
"use client";

import { useState, type CSSProperties } from "react";
import {
  coverColorOf,
  coverImageOf,
  sizedCover,
  textColorFor,
} from "@/lib/covers";
import type { Book } from "@/lib/types";

type CoverBook = Pick<
  Book,
  "title" | "author" | "cover_url" | "uploaded_cover" | "cover_color"
>;

/** A designed cover: solid colour, title and author in serif. */
export function GeneratedCover({
  title,
  author,
  color,
  className = "",
  style,
}: {
  title: string;
  author: string;
  color: string;
  className?: string;
  style?: CSSProperties;
}) {
  const long = title.length > 28;
  const ink = textColorFor(color);

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden p-[9%] ${className}`}
      style={{
        backgroundColor: color,
        color: ink,
        containerType: "inline-size",
        ...style,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 w-[6%] bg-black/10"
        aria-hidden
      />
      <div
        className="absolute inset-[5%] border border-current opacity-25"
        aria-hidden
      />

      <p
        className="relative z-10 pl-[4%] font-serif leading-[1.05] [overflow-wrap:anywhere]"
        style={{ fontSize: long ? "13cqw" : "16cqw" }}
      >
        {title}
      </p>

      <p
        className="relative z-10 pl-[4%] font-sans uppercase tracking-wider opacity-75"
        style={{ fontSize: "8.5cqw" }}
      >
        {author}
      </p>
    </div>
  );
}

/** Use larger covers by default for clearer display. */
export function BookCover({
  book,
  className = "",
  sizes,
  size = "L",
}: {
  book: CoverBook;
  className?: string;
  sizes?: string;
  size?: "M" | "L";
}) {
  const full = coverImageOf(book);
  const src = full && sizedCover(full, size);

  const [failed, setFailed] = useState<string | null>(null);

  const alt = `Cover of ${book.title}${
    book.author ? ` by ${book.author}` : ""
  }`;

  if (!src || failed === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`h-full w-full ${className}`}
      >
        <GeneratedCover
          title={book.title}
          author={book.author}
          color={coverColorOf(book)}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(src)}
      onLoad={(e) => {
        // Open Library can return a tiny placeholder for missing covers.
        if (e.currentTarget.naturalWidth < 10) {
          setFailed(src);
        }
      }}
      className={`h-full w-full object-contain ${className}`}
    />
  );
}
