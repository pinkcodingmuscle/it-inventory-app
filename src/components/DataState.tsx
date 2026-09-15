import type { ReactNode } from "react";
import { useData } from "../context/useData";

/** Wraps a page's content, swapping in a loading/error state while the API bundle loads. */
export function DataState({ children }: { children: ReactNode }) {
  const { loading, error, refresh } = useData();

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">Couldn't load data from the API.</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
        <button
          onClick={() => refresh()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
