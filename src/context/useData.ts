import { useContext } from "react";
import { DataContext, type DataContextValue } from "./contextValue";

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
