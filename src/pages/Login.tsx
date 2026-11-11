import { useState, type FormEvent } from "react";
import { login, signup } from "../lib/api";
import type { Actor } from "../types/domain";

type Mode = "sign-in" | "sign-up";

const MIN_PASSWORD = 8;
const input = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500";

export function Login({ message, onSignedIn }: { message?: string; onSignedIn: (user: Actor) => void }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setRepeat("");
  }

  async function handleSignIn() {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      onSignedIn(await login(email.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  async function handleSignUp() {
    if (!name.trim()) return setError("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < MIN_PASSWORD) return setError(`Use a password of at least ${MIN_PASSWORD} characters.`);
    if (password !== repeat) return setError("The passwords don't match.");
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      switchTo("sign-in");
      setNotice("Request sent. An administrator needs to approve your account; after that, sign in here.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the account.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    void (mode === "sign-in" ? handleSignIn() : handleSignUp());
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => switchTo(value)}
      className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
        mode === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );

  const signingUp = mode === "sign-up";
  const info = notice ?? (!signingUp && !error ? message : undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-400 text-sm font-semibold text-white">IT</div>
          <span className="text-xl font-semibold text-slate-900">IT Inventory</span>
        </div>

        <div role="tablist" aria-label="Sign in or create an account" className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {tab("sign-in", "Sign in")}
          {tab("sign-up", "Create account")}
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" noValidate>
          <h1 className="text-lg font-semibold text-gray-900">{signingUp ? "Create an account" : "Sign in"}</h1>
          {signingUp && (
            <p className="mt-1 text-sm text-gray-500">An administrator approves new accounts and decides what you can do.</p>
          )}
          {info && (
            <p role="status" className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              {info}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {signingUp && (
            <label className="mt-5 block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Full name</span>
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} autoFocus />
            </label>
          )}
          <label className={`${signingUp ? "mt-4" : "mt-5"} block`}>
            <span className="mb-1 block text-xs font-medium text-gray-600">Email</span>
            <input
              type="email"
              autoComplete={signingUp ? "email" : "username"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              autoFocus={!signingUp}
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Password</span>
            <input
              type="password"
              autoComplete={signingUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              aria-describedby={signingUp ? "password-hint" : undefined}
            />
          </label>
          {signingUp && <p id="password-hint" className="mt-1 text-[11px] text-gray-400">At least {MIN_PASSWORD} characters.</p>}
          {signingUp && (
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Repeat password</span>
              <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={input} />
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? (signingUp ? "Sending…" : "Signing in…") : signingUp ? "Request account" : "Sign in"}
          </button>
          <p className="mt-4 text-center text-xs text-gray-400">
            {signingUp ? (
              <>Already have an account? <button type="button" onClick={() => switchTo("sign-in")} className="font-medium text-blue-600 hover:underline">Sign in</button></>
            ) : (
              <>Forgot your password? Ask an administrator to reset it.</>
            )}
          </p>
        </form>
      </div>
    </main>
  );
}
