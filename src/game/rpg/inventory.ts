import type { Progress } from "../campaign/progression";
import { ITEMS } from "./content";
import {
  SLOTS,
  type InventoryEntry,
  type EquipmentInstance,
  type OverflowItem,
} from "./model";
export function inventory(
  profile: Progress,
  includeEquipped = true,
): InventoryEntry[] {
  const r = profile.rpg;
  if (!r) return [];
  return [
    ...r.equipment.map((e) => ({
      id: e.id,
      definitionId: e.definitionId,
      quantity: 1,
      equipment: e,
      favorite: e.favorite,
      locked: e.locked,
      equipped: Object.values(r.equipped).includes(e.id),
    })),
    ...Object.entries(profile.materials)
      .filter(([, n]) => n > 0)
      .map(([id, quantity]) => ({
        id: "stack:" + id,
        definitionId: id,
        quantity,
        ...(r.stackFlags[id] ?? { favorite: false, locked: false }),
        equipped: false,
      })),
    ...Object.entries(r.consumables)
      .filter(([, n]) => n > 0)
      .map(([id, quantity]) => ({
        id: "stack:" + id,
        definitionId: id,
        quantity,
        ...(r.stackFlags[id] ?? { favorite: false, locked: false }),
        equipped: false,
      })),
  ].filter((e) => includeEquipped || !e.equipped);
}
export const usedSlots = (p: Progress) => inventory(p, false).length;
export function findEntry(p: Progress, id: string) {
  const entry = inventory(p).find((e) => e.id === id);
  if (!entry) throw new Error("You do not own this item.");
  return entry;
}
export function canAdd(p: Progress, definitionId: string, quantity = 1) {
  const def = ITEMS[definitionId];
  if (!def) return false;
  if (def.kind === "equipment")
    return usedSlots(p) + quantity <= p.rpg!.capacity;
  const existing = inventory(p).some(
    (e) => e.definitionId === definitionId && !e.equipment,
  );
  return existing || usedSlots(p) < p.rpg!.capacity;
}
export function addEquipment(
  p: Progress,
  item: EquipmentInstance,
  overflowId?: string,
) {
  if (
    p.rpg!.equipment.some((e) => e.id === item.id) ||
    p.rpg!.overflow.some((e) => e.equipment?.id === item.id)
  )
    throw new Error("Duplicate equipment ID");
  if (canAdd(p, item.definitionId)) p.rpg!.equipment.push(item);
  else if (overflowId)
    p.rpg!.overflow.push({ id: overflowId, equipment: item });
  else throw new Error("Inventory full. Free a bag slot first.");
}
export function grantStack(
  p: Progress,
  definitionId: string,
  quantity: number,
  overflowId?: string,
) {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    !ITEMS[definitionId] ||
    ITEMS[definitionId].kind === "equipment"
  )
    throw new Error("Invalid stack");
  if (!canAdd(p, definitionId)) {
    if (overflowId) {
      p.rpg!.overflow.push({ id: overflowId, definitionId, quantity });
      return;
    }
    throw new Error("Inventory full. Free a bag slot first.");
  }
  const target =
    ITEMS[definitionId].kind === "material" ? p.materials : p.rpg!.consumables;
  const next = (target[definitionId] ?? 0) + quantity;
  if (!Number.isSafeInteger(next)) throw new Error("Invalid stack quantity");
  target[definitionId] = next;
}
export function removeEntry(p: Progress, entry: InventoryEntry, quantity = 1) {
  if (entry.equipped || entry.locked || entry.favorite)
    throw new Error("Equipped, locked and favorite items are protected.");
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > entry.quantity
  )
    throw new Error("Invalid quantity");
  if (entry.equipment)
    p.rpg!.equipment = p.rpg!.equipment.filter((e) => e.id !== entry.id);
  else {
    const target =
      ITEMS[entry.definitionId].kind === "material"
        ? p.materials
        : p.rpg!.consumables;
    target[entry.definitionId] -= quantity;
  }
}
export function claim(p: Progress, id: string) {
  const r = p.rpg!,
    index = r.overflow.findIndex((e) => e.id === id);
  if (index < 0) throw new Error("Loot parcel already claimed.");
  const parcel: OverflowItem = r.overflow[index];
  if (!canAdd(p, parcel.equipment?.definitionId ?? parcel.definitionId!))
    throw new Error("Inventory full. Free a bag slot first.");
  r.overflow.splice(index, 1);
  if (parcel.equipment) addEquipment(p, parcel.equipment);
  else grantStack(p, parcel.definitionId!, parcel.quantity!);
}
export function emptyEquipment() {
  return Object.fromEntries(SLOTS.map((s) => [s, null])) as Record<
    (typeof SLOTS)[number],
    string | null
  >;
}
