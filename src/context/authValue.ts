import { createContext, useContext } from "react";
import type { Actor, Permission } from "../types/domain";

export interface AuthContextValue {
  user: Actor;
  signOut: () => Promise<void>;
  /** Replaces the signed-in user's details (e.g. after they edit their own name). */
  setUser: (user: Actor) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** The signed-in user. Only usable inside the signed-in part of the app. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// What each permission tier may do, mirroring the API's route guards. The UI
// hides actions a user can't perform; the API enforces it regardless.
const tiers: Record<string, Permission[]> = {
  manage: ["administrator", "inventory_manager"],
  move: ["administrator", "inventory_manager", "technician"],
  admin: ["administrator"],
};

export function usePermissions() {
  const { user } = useAuth();
  return {
    /** Add/edit/delete items, vendors, locations, orders; recount stock; change settings. */
    canManage: tiers.manage.includes(user.permission),
    /** Check stock out and back in. */
    canMove: tiers.move.includes(user.permission),
    /** Manage user accounts. */
    isAdmin: tiers.admin.includes(user.permission),
  };
}

export const permissionLabels: Record<Permission, string> = {
  administrator: "Administrator",
  inventory_manager: "Inventory manager",
  technician: "Technician",
  read_only: "Read only",
};
