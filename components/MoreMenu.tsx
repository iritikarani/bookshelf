"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Item {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

/** "•••" button opening a small labelled menu, so every action says what it does. */
export function MoreMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More: decorate, shelves, share, settings"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-paper/70 text-ink shadow-sm ring-1 ring-line/70 backdrop-blur transition hover:bg-paper"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div id={id} role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 animate-fade-in overflow-hidden rounded-2xl bg-paper py-1.5 shadow-xl ring-1 ring-line">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-base transition hover:bg-ink/5 disabled:opacity-40"
            >
              <span className="text-ink-soft">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
