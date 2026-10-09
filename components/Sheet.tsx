"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { XIcon } from "./Icons";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog. `panel`: side panel on desktop, bottom sheet on mobile.
 * `modal`: centred card on desktop, bottom sheet on mobile.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  variant = "modal",
  wide = false,
  hideTitle = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: "panel" | "modal" | "book";
  wide?: boolean;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // Phones: keep the sheet above the on-screen keyboard. Browsers that cover the page with the
  // keyboard (iOS Safari, some Android browsers) shrink the visual viewport; lift the sheet by
  // the hidden part and cap its height to what's still visible.
  const [kb, setKb] = useState<{ bottom: number; height: number } | null>(null);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!open || !vv) return;
    const update = () => {
      if (window.innerWidth >= 768) return setKb(null);
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKb(hidden > 40 ? { bottom: hidden, height: vv.height } : null);
    };
    // A focused field scrolls into the part of the sheet that's still visible.
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.matches?.("input,textarea,select")) return;
      window.setTimeout(() => el.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    ref.current?.addEventListener("focusin", onFocus);
    const node = ref.current;
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      node?.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  if (!open) return null;
  const lift: CSSProperties | undefined = kb ? { bottom: kb.bottom, maxHeight: Math.max(240, kb.height - 12) } : undefined;

  const desktop =
    variant === "book"
      ? "md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-h-[90dvh] md:w-[min(940px,94vw)] md:rounded-lg md:animate-book-open"
      : variant === "panel"
      ? "md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[440px] md:rounded-none md:rounded-l-2xl md:animate-panel-in"
      : `md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-h-[90dvh] md:rounded-2xl md:animate-fade-in ${wide ? "md:w-[680px]" : "md:w-[520px]"}`;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={lift}
        className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-sheet-up flex-col rounded-t-2xl bg-paper text-ink shadow-2xl ${desktop}`}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 md:hidden" aria-hidden />
        <div className={`flex shrink-0 items-center justify-between gap-4 px-5 pb-2 pt-3 ${hideTitle ? "absolute right-0 top-1 z-10" : ""}`}>
          {!hideTitle && <h2 className="font-serif text-2xl leading-tight">{title}</h2>}
          <button type="button" onClick={onClose} className="rounded-full bg-paper/80 p-2 text-ink-soft hover:bg-ink/5 hover:text-ink" aria-label="Close">
            <XIcon />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${variant === "book" ? "" : "px-5 pb-6"}`}>{children}</div>
      </div>
    </div>
  );
}
