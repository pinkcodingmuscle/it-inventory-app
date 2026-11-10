import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

/**
 * Applies one-shot query parameters from links (e.g. `/inventory?new=1`, `?q=toner`) once per
 * navigation, then removes them from the URL so reloading doesn't repeat them (e.g. reopen a dialog).
 * `apply` runs during render, so it may only set state of the calling component.
 */
export function useLinkParams(apply: (params: URLSearchParams) => void) {
  const [params, setParams] = useSearchParams();
  const { key } = useLocation();
  const [handledKey, setHandledKey] = useState<string | null>(null);

  if (key !== handledKey) {
    setHandledKey(key);
    if (params.toString()) apply(params);
  }

  useEffect(() => {
    if (params.toString()) setParams({}, { replace: true });
  }, [params, setParams]);
}
