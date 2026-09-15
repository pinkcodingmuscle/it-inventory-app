import { useCallback, useEffect, useState, type ReactNode } from "react";
import { setAppData } from "../data/store";
import { fetchAppData } from "../lib/api";
import { DataContext } from "./contextValue";

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppData();
      setAppData(data);
      setRevision((r) => r + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data from the API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await refresh();
    };
    void loadData();
  }, [refresh]);

  return <DataContext.Provider value={{ loading, error, revision, refresh }}>{children}</DataContext.Provider>;
}
