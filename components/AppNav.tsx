"use client";

import type { ReactNode } from "react";
import type { AppTab } from "@/lib/useTab";
import { BooksIcon, CompassIcon, HomeIcon, JournalIcon, UserIcon } from "./Icons";

export const NAV: { id: AppTab; label: string; icon: (p: { width: number; height: number }) => ReactNode }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "shelf", label: "My Shelf", icon: BooksIcon },
  { id: "discover", label: "Discover", icon: CompassIcon },
  { id: "journal", label: "Journal", icon: JournalIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
];

/** The top of every page: wordmark, the five pages (on wider screens) and the page's actions. */
export function TopBar({ tab, onTab, actions }: { tab: AppTab; onTab: (t: AppTab) => void; actions?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
      <button type="button" onClick={() => onTab("home")} className="whitespace-nowrap font-serif text-xl leading-none tracking-tight md:text-2xl" aria-label="Cosmic Space, home">
        Cosmic Space<span className="text-accent">.</span>
      </button>
      <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-paper/70 p-1 shadow-sm ring-1 ring-line/70 backdrop-blur md:flex">
        {NAV.map((n) => {
          const on = tab === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onTab(n.id)}
              aria-current={on ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${on ? "bg-ink text-wall" : "text-ink-soft hover:text-ink"}`}
            >
              {n.label}
            </button>
          );
        })}
      </nav>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Phones: the five pages as a bar along the bottom, in thumb reach. */
export function BottomNav({ tab, onTab }: { tab: AppTab; onTab: (t: AppTab) => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(0,0,0,.35)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map((n) => {
          const on = tab === n.id;
          const Icon = n.icon;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onTab(n.id)}
                aria-current={on ? "page" : undefined}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${on ? "text-ink" : "text-ink-soft"}`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-accent/15 text-accent" : ""}`}>
                  <Icon width={21} height={21} />
                </span>
                {n.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A page's heading: a serif title and one quiet line under it. */
export function PageTitle({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div className="min-w-0">
        <h1 className="font-serif text-[34px] leading-[1.05] tracking-tight md:text-5xl">{title}</h1>
        {sub && <p className="mt-1.5 text-base text-ink-soft">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

/** Thoughtful empty states: a line, a reason, and the one thing to do next. */
export function EmptyState({ icon = "📚", title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-dashed border-ink-soft/35 bg-paper/50 px-6 py-12 text-center">
      <p className="text-4xl" aria-hidden>
        {icon}
      </p>
      <p className="mt-3 font-serif text-2xl">{title}</p>
      {children && <p className="mt-2 text-ink-soft">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
