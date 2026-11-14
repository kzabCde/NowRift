/** A directory points to real entrances; it cannot teleport or start restricted activities. */
export const ACTIVITIES = [
  {
    id: "story",
    name: "Story & quests",
    description: "Mara has a request. Track it in your journal.",
    landmark: "mara",
  },
  {
    id: "campaign",
    name: "Campaign worlds",
    description: "Four worlds, forty Story missions and their guardians.",
    landmark: "portal",
  },
  {
    id: "farming",
    name: "Farming expeditions",
    description: "Gather supplies, survive and extract.",
    landmark: "portal",
  },
  {
    id: "crafting",
    name: "Crafting workshop",
    description: "Turn materials into useful supplies.",
    landmark: "workshop",
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    description: "Enhance or dismantle your equipment.",
    landmark: "forge",
  },
  {
    id: "merchant",
    name: "Rift Outfitters",
    description: "Buy and sell using your real inventory.",
    landmark: "market",
  },
  {
    id: "inventory",
    name: "Inventory & equipment",
    description: "Manage your shared bag and equipped gear.",
    landmark: "store",
  },
  {
    id: "appearance",
    name: "Character appearance",
    description: "Preview and save a cloak palette.",
    landmark: "wardrobe",
  },
  {
    id: "training",
    name: "Training grounds",
    description: "Test your weapons without permanent rewards.",
    landmark: "training",
  },
  {
    id: "rest",
    name: "Inn & healing",
    description: "Restore health and save your journey.",
    landmark: "inn",
  },
  {
    id: "daily",
    name: "Quest board",
    description: "Review your quest and daily progress.",
    landmark: "board",
  },
] as const;
