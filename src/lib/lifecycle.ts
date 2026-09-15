import type { Asset, CatalogItem } from "../types/domain";

export type LifecycleBucket =
  | "past_eol"
  | "0_30"
  | "31_60"
  | "61_90"
  | "91_180"
  | "181_365"
  | "on_track"
  | "no_date";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ISO date strings ("2024-03-01") parse as UTC midnight; using the local
// getMonth/setMonth pair here would silently roll the date across a day
// boundary in any timezone west of UTC, so lifecycle math stays in UTC.
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** Replacement due date, or undefined if the catalog item has no lifecycle policy. */
export function getReplacementDueDate(asset: Asset, catalogItem: CatalogItem | undefined): Date | undefined {
  if (!asset.purchaseDate || !catalogItem?.lifecycleMonths) return undefined;
  return addMonths(new Date(asset.purchaseDate), catalogItem.lifecycleMonths);
}

export function getAgeInYears(purchaseDate: string | undefined, now: Date = new Date()): number | undefined {
  if (!purchaseDate) return undefined;
  const days = (now.getTime() - new Date(purchaseDate).getTime()) / MS_PER_DAY;
  return days / 365.25;
}

export function getDaysRemaining(dueDate: Date | undefined, now: Date = new Date()): number | undefined {
  if (!dueDate) return undefined;
  return Math.round((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
}

export function getLifecycleBucket(daysRemaining: number | undefined): LifecycleBucket {
  if (daysRemaining === undefined) return "no_date";
  if (daysRemaining < 0) return "past_eol";
  if (daysRemaining <= 30) return "0_30";
  if (daysRemaining <= 60) return "31_60";
  if (daysRemaining <= 90) return "61_90";
  if (daysRemaining <= 180) return "91_180";
  if (daysRemaining <= 365) return "181_365";
  return "on_track";
}

export const lifecycleBucketLabels: Record<LifecycleBucket, string> = {
  past_eol: "Past EOL",
  "0_30": "0–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  "91_180": "91–180 days",
  "181_365": "181–365 days",
  on_track: "On Track",
  no_date: "No Date",
};

export function formatMonthYear(date: Date | undefined): string {
  if (!date) return "N/A";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatRemaining(daysRemaining: number | undefined): string {
  if (daysRemaining === undefined) return "N/A";
  if (daysRemaining < 0) return "Past EOL";
  if (daysRemaining > 730) return `${(daysRemaining / 365).toFixed(1)}+ years`;
  return `${daysRemaining} days`;
}
