"use client";

import { useState, type FormEvent } from "react";
import { EXAMPLE_ITEMS, EXAMPLE_SHELF } from "@/lib/examples";
import { store } from "@/lib/store";
import { ShelfWall } from "./ShelfWall";
import { GoogleIcon } from "./Icons";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        await store.signInWithEmail(email, password);
      } else {
        const { needsConfirmation } = await store.signUpWithEmail(email, password);
        if (needsConfirmation) setNotice("Check your inbox to confirm your email, then come back and sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main data-style="pastel" className="room flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-10 md:flex-row md:gap-16">
      <div className="w-full max-w-sm md:order-2">
        <div aria-hidden className="mx-auto max-w-[360px]">
          <ShelfWall shelves={[EXAMPLE_SHELF]} itemsByShelf={new Map([[EXAMPLE_SHELF.id, EXAMPLE_ITEMS]])} structure="case" onOpenBook={() => {}} readOnly floor={false} />
        </div>
        <p className="mt-6 text-center font-serif text-xl leading-snug text-ink-soft">“I declare after all there is no enjoyment like reading!”</p>
      </div>

      <div className="w-full max-w-sm">
        <h1 className="font-serif text-5xl leading-none">
          Cosmic Space<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-ink-soft">A private shelf for the books you've finished, and a journal entry for each one.</p>

        <button type="button" className="btn-ghost mt-8 w-full bg-paper py-2.5" onClick={() => store.signInWithGoogle().catch((e) => setError(e.message))}>
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-ink-soft">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" required autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
          <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create my shelf"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-soft">
          {mode === "signin" ? "New here? " : "Already have a shelf? "}
          <button type="button" className="font-medium text-accent underline-offset-2 hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
