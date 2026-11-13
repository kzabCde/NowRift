/** Shared local-first inventory capacity rules. Every purchase is permanent. */
export const BAG_BASE_CAPACITY = 60;
export const BAG_STEP = 10;
export const BAG_MAX_CAPACITY = 120;
export const BAG_UPGRADE_COSTS = [500, 1000, 2000, 4000, 8000, 16000] as const;

export function validBagCapacity(capacity: number): boolean {
  return (
    Number.isSafeInteger(capacity) &&
    capacity >= BAG_BASE_CAPACITY &&
    capacity <= BAG_MAX_CAPACITY &&
    (capacity - BAG_BASE_CAPACITY) % BAG_STEP === 0
  );
}

export function bagUpgradeCost(capacity: number): number | null {
  if (!validBagCapacity(capacity)) throw new Error("Invalid bag capacity.");
  if (capacity === BAG_MAX_CAPACITY) return null;
  return BAG_UPGRADE_COSTS[(capacity - BAG_BASE_CAPACITY) / BAG_STEP];
}
