import type { Progress } from "../campaign/progression";
import type { ShopOffer } from "./content";
import { canAdd } from "./inventory";

/** Shared purchase gate for the merchant UI and the atomic economy command. */
export function purchaseEligibility(
  profile: Progress,
  offer: ShopOffer,
  quantity = 1,
) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99)
    return "Enter a quantity from 1 to 99.";
  if (offer.requiredClear && !profile.clears.includes(offer.requiredClear))
    return "Complete the required world milestone before buying this offer.";
  if (!canAdd(profile, offer.item, offer.rarity ? quantity : 1))
    return "Inventory full.";
  if (profile.gold < offer.price * quantity) return "Not enough gold.";
  return null;
}
