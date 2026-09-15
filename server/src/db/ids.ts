import { v5 as uuidv5 } from "uuid";

// Fixed, arbitrary namespace so seed slugs (e.g. "usr-esther") always resolve
// to the same UUID across runs, keeping the seed script repeatable.
const SEED_NAMESPACE = "6f6d6a10-6d1c-4c0a-9f0b-6c1e6a4b8e2a";

export function seedId(slug: string): string {
  return uuidv5(slug, SEED_NAMESPACE);
}
