"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { EXAMPLE_ITEMS, EXAMPLE_SHELF } from "@/lib/examples";
import { hasSupabase, setGuest, store } from "@/lib/store";
import { sendPasswordReset, setNewPassword } from "@/lib/store/supabase";
import type { ShelfItem } from "@/lib/types";
import { GoogleIcon } from "./Icons";
import { RoomWindow } from "./RoomScene";
import { ShelfWall } from "./ShelfWall";

type Mode = "signin" | "signup" | "forgot" | "reset";

/** The front door: what Cosmic Space is, and a card to sign in, sign up or come in as a guest. */
export function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("reset") ? "reset" : params.get("signup") ? "signup" : "signin");
  const examples = useMemo(() => new Map<string, ShelfItem[]>([[EXAMPLE_SHELF.id, EXAMPLE_ITEMS]]), []);

  // Already signed in? Straight to the shelf (unless finishing a password reset).
  useEffect(() => {
    if (!hasSupabase || mode === "reset") return;
    setGuest(false);
    store.getUser().then((u) => u && router.replace("/"));
    return store.onAuthChange((u) => {
      if (u) router.replace("/");
    });
  }, [mode, router]);

  const enterAsGuest = () => {
    setGuest(true);
    router.push("/");
  };

  return (
    <main data-style="pastel" className="room min-h-dvh">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:px-8">
        {/* ── the pitch ── */}
        <section>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">A reading journal</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.02] md:text-6xl">
            Cosmic Space<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
            A shelf for every book you’ve finished, in a room that feels like home. Tap a book and it opens to what you wrote about it.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            <Feature icon="📚">Arrange spines, covers and little objects, just like a real bookcase</Feature>
            <Feature icon="❤">Mark favourites, what you’re reading now, and what’s next</Feature>
            <Feature icon="✍">Keep a rating, what stayed with you, and your favourite line</Feature>
          </ul>

          <div className="relative mt-10 hidden items-end gap-6 sm:flex" aria-hidden>
            <RoomWindow className="mb-6 hidden h-[190px] w-[130px] shrink-0 md:block" />
            <div className="pointer-events-none min-w-0 flex-1 [--cover-h:96px] [--cover-w:64px] [--spine-scale:0.75] [&_.shelf-cell_h2]:hidden">
              <ShelfWall shelves={[EXAMPLE_SHELF]} itemsByShelf={examples} structure="case" onOpenBook={() => {}} readOnly floor={false} />
            </div>
          </div>
        </section>

        {/* ── the card ── */}
        <section className="w-full max-w-md justify-self-center rounded-3xl bg-paper/95 p-6 shadow-[0_30px_60px_-30px_rgba(60,40,30,0.45)] ring-1 ring-line/70 backdrop-blur md:p-8 lg:justify-self-end">
          {hasSupabase ? (
            <AuthCard mode={mode} setMode={setMode} onGuest={enterAsGuest} onDone={() => router.replace("/")} />
          ) : (
            <NoAccounts onEnter={enterAsGuest} />
          )}
        </section>
      </div>
    </main>
  );
}

function Feature({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-sm shadow-sm ring-1 ring-line">
        {icon}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

function NoAccounts({ onEnter }: { onEnter: () => void }) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Come on in</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Your shelf is saved in this browser. Accounts (email and Google sign-in, syncing across devices) switch on once this site is connected to Supabase.
      </p>
      <button type="button" className="btn-primary mt-6 w-full py-3 text-base" onClick={onEnter}>
        Open my shelf
      </button>
    </div>
  );
}

function AuthCard({ mode, setMode, onGuest, onDone }: { mode: Mode; setMode: (m: Mode) => void; onGuest: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        await store.signInWithEmail(email, password);
        onDone();
      } else if (mode === "signup") {
        const { needsConfirmation } = await store.signUpWithEmail(email, password);
        if (needsConfirmation) setNotice("Almost there. We sent you an email; tap the link in it to open your shelf.");
        else onDone();
      } else if (mode === "forgot") {
        await sendPasswordReset(email);
        setNotice("If there’s an account for that email, a reset link is on its way.");
      } else {
        await setNewPassword(password);
        setNotice("Password updated. Taking you to your shelf…");
        window.setTimeout(onDone, 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    signin: ["Welcome back", "Sign in to your shelf."],
    signup: ["Start your shelf", "Create an account. It takes a few seconds."],
    forgot: ["Reset your password", "We’ll email you a link to choose a new one."],
    reset: ["Choose a new password", "Then you’re straight back to your books."],
  };
  const [title, subtitle] = titles[mode];
  const needsEmail = mode !== "reset";
  const needsPassword = mode === "signin" || mode === "signup" || mode === "reset";

  return (
    <div>
      {(mode === "signin" || mode === "signup") && (
        <div className="mb-6 grid grid-cols-2 rounded-full bg-ink/5 p-1 text-sm" role="tablist" aria-label="Sign in or create an account">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchTo(m)}
              className={`rounded-full py-2 font-medium transition ${mode === m ? "bg-paper shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      <h2 className="font-serif text-3xl leading-tight">{title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>

      {(mode === "signin" || mode === "signup") && (
        <>
          <button
            type="button"
            className="btn-ghost mt-6 w-full bg-paper py-3"
            onClick={() => store.signInWithGoogle().catch((e) => setError(e instanceof Error ? e.message : "Google sign-in failed."))}
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-ink-soft">
            <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={`space-y-3 ${mode === "forgot" || mode === "reset" ? "mt-6" : ""}`}>
        {needsEmail && (
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required autoComplete="email" className="field py-2.5" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        {needsPassword && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="login-password">{mode === "reset" ? "New password" : "Password"}</label>
              {mode === "signin" && (
                <button type="button" className="text-xs text-accent underline-offset-2 hover:underline" onClick={() => switchTo("forgot")}>
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="field py-2.5 pr-16"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-ink-soft hover:text-ink"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {mode !== "signin" && <p className="mt-1 text-xs text-ink-soft">At least 6 characters.</p>}
          </div>
        )}

        {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{notice}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create my shelf" : mode === "forgot" ? "Send reset link" : "Save new password"}
        </button>
      </form>

      {(mode === "forgot" || mode === "reset") && (
        <button type="button" className="mt-4 text-sm text-accent underline-offset-2 hover:underline" onClick={() => switchTo("signin")}>
          ← Back to sign in
        </button>
      )}

      {(mode === "signin" || mode === "signup") && (
        <div className="mt-6 border-t border-line pt-5 text-center">
          <button type="button" className="text-sm font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline" onClick={onGuest}>
            Just looking? Continue as a guest
          </button>
          <p className="mt-1 text-xs text-ink-soft">A guest shelf is saved in this browser only.</p>
        </div>
      )}
    </div>
  );
}
