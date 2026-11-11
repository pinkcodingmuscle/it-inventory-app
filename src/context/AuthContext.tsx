import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SIGNED_OUT_EVENT, fetchCurrentUser, getToken, logout } from "../lib/api";
import { Login } from "../pages/Login";
import type { Actor } from "../types/domain";
import { AuthContext } from "./authValue";

type State = { status: "checking" } | { status: "signed-out"; message?: string } | { status: "signed-in"; user: Actor };

/** Shows the sign-in page until there is a valid session, then renders the app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => (getToken() ? { status: "checking" } : { status: "signed-out" }));

  // Restore a saved session on load.
  useEffect(() => {
    if (state.status !== "checking") return;
    let cancelled = false;
    fetchCurrentUser()
      .then((user) => !cancelled && setState({ status: "signed-in", user }))
      .catch(() => !cancelled && setState({ status: "signed-out" }));
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  // Any API call that comes back 401 (expired, deactivated, signed out elsewhere).
  useEffect(() => {
    const onSignedOut = () => setState({ status: "signed-out", message: "Your session ended. Please sign in again." });
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, []);

  const signOut = useCallback(async () => {
    await logout().catch(() => undefined);
    setState({ status: "signed-out" });
  }, []);

  const setUser = useCallback((user: Actor) => setState({ status: "signed-in", user }), []);

  if (state.status === "checking") {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-gray-400">Loading…</div>;
  }
  if (state.status === "signed-out") {
    return <Login message={state.message} onSignedIn={setUser} />;
  }
  return <AuthContext.Provider value={{ user: state.user, signOut, setUser }}>{children}</AuthContext.Provider>;
}
