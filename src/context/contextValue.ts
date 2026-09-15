import { createContext } from "react";

export interface DataContextValue {
  loading: boolean;
  error: string | null;
  /** Bumped on every successful refresh; depend on it in useMemo to recompute selectors. */
  revision: number;
  refresh: () => Promise<void>;
}

export const DataContext = createContext<DataContextValue | null>(null);
