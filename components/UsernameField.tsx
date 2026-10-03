"use client";

import { useEffect, useState } from "react";
import { isUsernameAvailable } from "@/lib/store/supabase";
import { normalizeUsername, usernameProblem } from "@/lib/username";

export type UsernameStatus = "empty" | "invalid" | "checking" | "available" | "taken" | "unknown";

/**
 * Username input with live feedback: format rules first, then (after a short pause)
 * whether the name is free. `current` is the reader's own username, which counts as available.
 */
export function UsernameField({
  value,
  onChange,
  onStatus,
  current,
  id = "username",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onStatus: (s: UsernameStatus) => void;
  current?: string | null;
  id?: string;
  autoFocus?: boolean;
}) {
  const [status, setStatus] = useState<UsernameStatus>("empty");
  const name = normalizeUsername(value);
  const problem = name ? usernameProblem(name) : null;

  useEffect(() => {
    let next: UsernameStatus;
    if (!name) next = "empty";
    else if (problem) next = "invalid";
    else if (current && name === current) next = "available";
    else next = "checking";
    setStatus(next);
    onStatus(next);
    if (next !== "checking") return;

    let alive = true;
    const t = window.setTimeout(async () => {
      try {
        const free = await isUsernameAvailable(name);
        if (!alive) return;
        const s: UsernameStatus = free ? "available" : "taken";
        setStatus(s);
        onStatus(s);
      } catch {
        // Can't check right now (offline, or the database isn't updated yet); the server decides on save.
        if (!alive) return;
        setStatus("unknown");
        onStatus("unknown");
      }
    }, 400);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, problem, current]);

  const hint =
    status === "invalid"
      ? { text: problem!, tone: "text-danger" }
      : status === "checking"
        ? { text: "Checking…", tone: "text-ink-soft" }
        : status === "available"
          ? { text: `@${name} is yours to take`, tone: "text-accent" }
          : status === "taken"
            ? { text: `@${name} is taken. Try another.`, tone: "text-danger" }
            : { text: "3–20 characters: letters, numbers, “_” and “.”", tone: "text-ink-soft" };

  return (
    <div>
      <label className="label" htmlFor={id}>Username</label>
      <div className="relative">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">@</span>
        <input
          id={id}
          type="text"
          required
          autoFocus={autoFocus}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={21}
          className="field py-2.5 pl-8"
          placeholder="ritika_reads"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
          aria-describedby={`${id}-hint`}
          aria-invalid={status === "invalid" || status === "taken"}
        />
      </div>
      <p id={`${id}-hint`} className={`mt-1 text-xs ${hint.tone}`} aria-live="polite">
        {hint.text}
      </p>
    </div>
  );
}

/** True when the form may go ahead with this username. "unknown" lets the server decide. */
export const usernameOk = (s: UsernameStatus) => s === "available" || s === "unknown";
