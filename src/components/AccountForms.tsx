import { useState } from "react";
import { useAuth } from "../context/authValue";
import { useData } from "../context/useData";
import { changePassword, createUser, deleteUser, setUserPassword, updateUser } from "../lib/api";
import type { User } from "../types/domain";
import { Field, FormError, Modal, inputClass, primaryButtonClass, secondaryButtonClass } from "./Modal";

const MIN_PASSWORD = 8;

/** The roles the API maps onto permission tiers (see server/src/middleware/auth.ts). */
const roleOptions = [
  { role: "IT Administrator", help: "Everything, including user accounts" },
  { role: "Inventory Manager", help: "Manage items, vendors, locations, orders, and settings" },
  { role: "Tech Support", help: "View everything; check stock out and back in" },
  { role: "Viewer", help: "View only" },
] as const;

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (next.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (next !== repeat) return setError("The new passwords don't match.");
    setSaving(true);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change the password.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Modal title="Change Password" onClose={onClose} footer={<button onClick={onClose} className={primaryButtonClass}>Done</button>}>
        <p className="text-sm text-gray-600">Password changed. You've been signed out on your other devices.</p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Change Password"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>{saving ? "Saving..." : "Change Password"}</button>
        </>
      }
    >
      <FormError message={error} />
      <div className="space-y-4">
        <Field label="Current password">
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} autoFocus />
        </Field>
        <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Repeat new password">
          <input type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

/** Add a user, or edit one (name, email, role, active). Administrators only. */
export function UserModal({ user, onClose }: { user?: User; onClose: () => void }) {
  const { refresh } = useData();
  const { user: me } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "Tech Support");
  const [active, setActive] = useState((user?.status ?? "active") === "active");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isSelf = user?.id === me.id;
  // Keep a role that isn't one of the standard four (e.g. imported job titles) selectable.
  const roles = roleOptions.some((r) => r.role === role) ? roleOptions : [{ role, help: "Existing role" }, ...roleOptions];

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!user && password && password.length < MIN_PASSWORD) return setError(`Passwords need at least ${MIN_PASSWORD} characters.`);
    setSaving(true);
    try {
      if (user) {
        await updateUser(user.id, {
          name: name.trim(),
          email: email.trim(),
          role,
          // Pending sign-ups are approved or declined from the request list, not here.
          ...(user.status === "pending" ? {} : { status: active ? "active" : "inactive" }),
        });
      } else {
        await createUser({ name: name.trim(), email: email.trim(), role, password: password || undefined });
      }
      onClose();
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't save the user.";
      setError(/unique/i.test(message) ? "Another user already has that email." : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={user ? `Edit ${user.name}` : "Add User"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>{saving ? "Saving..." : user ? "Save" : "Add User"}</button>
        </>
      }
    >
      <FormError message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoFocus />
        </Field>
        <Field label="Email *" hint="They sign in with this.">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Role" hint={roles.find((r) => r.role === role)?.help}>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf} className={inputClass}>
              {roles.map((r) => <option key={r.role} value={r.role}>{r.role}</option>)}
            </select>
          </Field>
        </div>
        {!user && (
          <div className="sm:col-span-2">
            <Field label="Password" hint={`At least ${MIN_PASSWORD} characters. Leave empty to set one later.`}>
              <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}
        {user && !isSelf && user.status !== "pending" && (
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
            Active (inactive users can't sign in)
          </label>
        )}
      </div>
    </Modal>
  );
}

/** An administrator sets a new password for someone else (signs them out everywhere). */
export function SetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { refresh } = useData();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    setSaving(true);
    try {
      await setUserPassword(user.id, password);
      onClose();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set the password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`${user.hasPassword ? "Reset" : "Set"} password for ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>{saving ? "Saving..." : "Set Password"}</button>
        </>
      }
    >
      <FormError message={error} />
      <Field label="New password" hint={`At least ${MIN_PASSWORD} characters. Share it with them securely; they can change it after signing in.`}>
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoFocus />
      </Field>
    </Modal>
  );
}

/** Accounts people requested from the sign-in page; an administrator approves (with a role) or declines them. */
export function SignupRequests({ requests }: { requests: User[] }) {
  const { refresh } = useData();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(user: User, action: "approve" | "decline") {
    if (action === "decline" && !window.confirm(`Decline ${user.name}'s request? Their account request is deleted.`)) return;
    setError(null);
    setBusyId(user.id);
    try {
      if (action === "approve") await updateUser(user.id, { status: "active", role: roles[user.id] ?? "Viewer" });
      else await deleteUser(user.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        {requests.length} sign-up request{requests.length === 1 ? "" : "s"} waiting for approval
      </p>
      <FormError message={error} />
      <ul className="mt-3 divide-y divide-amber-200">
        {requests.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">{u.name}</span>
              <span className="block truncate text-xs text-gray-600">{u.email}</span>
            </span>
            <select
              value={roles[u.id] ?? "Viewer"}
              onChange={(e) => setRoles((r) => ({ ...r, [u.id]: e.target.value }))}
              aria-label={`Role for ${u.name}`}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
            >
              {roleOptions.map((r) => <option key={r.role} value={r.role}>{r.role}</option>)}
            </select>
            <button
              onClick={() => void act(u, "approve")}
              disabled={busyId === u.id}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => void act(u, "decline")}
              disabled={busyId === u.id}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              Decline
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
