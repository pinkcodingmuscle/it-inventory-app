import type { ID } from "../types/domain";

export function byId<T extends { id: ID }>(records: T[]): Record<ID, T> {
  const map: Record<ID, T> = {};
  for (const record of records) map[record.id] = record;
  return map;
}
