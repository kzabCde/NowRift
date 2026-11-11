import { calculateStats, resolveEquippedWeapon } from "../rpg/stats";
import { grantGift } from "../persistence/daily";
import type { SaveData } from "../persistence/model";
import { HAVEN, LANDMARKS, near, validPosition } from "./content";
import { OUTFITS, type WorldCommand } from "./save";
export function applyWorldCommand(
  p: SaveData,
  command: WorldCommand,
  at: number,
) {
  const w = p.local.world!;
  if (command.type === "enter") {
    if (!command.writer) throw new Error("Invalid world session.");
    w.writer = command.writer;
    w.sequence = 0;
    if (
      w.location === "expedition" &&
      !p.local.checkpoint &&
      !p.local.activeRun
    ) {
      w.location = "haven";
      w.position = { ...HAVEN.return };
    }
    return;
  }
  if (w.writer !== command.writer)
    throw new Error(
      "This world is open in another tab. Return to the launcher and enter again.",
    );
  if (command.type === "position") {
    if (
      !Number.isSafeInteger(command.sequence) ||
      command.sequence <= w.sequence
    )
      return;
    if (!validPosition(command.position))
      throw new Error("That position is blocked. Return to the plaza.");
    w.position = { ...command.position };
    w.sequence = command.sequence;
    return;
  }
  if (command.type === "visit") {
    const l = LANDMARKS.find((l) => l.id === command.id);
    if (
      !l ||
      !validPosition(command.position) ||
      !near(command.position, l.entrance)
    )
      throw new Error("Move closer to interact.");
    w.position = { ...command.position };
    if (!w.discoveries.includes(l.id)) w.discoveries.push(l.id);
    return;
  }
  if (command.type === "outfit") {
    if (!OUTFITS.includes(command.outfit))
      throw new Error("Invalid appearance.");
    w.outfit = command.outfit;
    return;
  }
  if (command.type === "weapon") {
    throw new Error("Choose an owned weapon in Inventory.");
  }
  if (command.type === "accept") {
    if (w.quest === "available")
      w.quest = w.extractions > 0 ? "completed" : "active";
    return;
  }
  if (command.type === "claim") {
    if (w.quest !== "completed" || w.extractions < 1)
      throw new Error("Complete the expedition before claiming.");
    grantGift(
      p,
      { gold: 100, materials: { "enhancement-stone": 2 } },
      `quest:${p.local.id}:haven-arrival`,
      at,
      "A path home",
    );
    w.quest = "claimed";
    return;
  }
  if (command.type === "rest") {
    w.hp = calculateStats(p, p.local.weapon, p.local.character).maxHp;
    return;
  }
  if (command.type === "treasure") {
    if (w.cacheClaimed) throw new Error("This cache was already collected.");
    if (!near(w.position, LANDMARKS.find((l) => l.id === "cache")!.entrance))
      throw new Error("Move closer to interact.");
    grantGift(
      p,
      { gold: 30, materials: { wood: 2 } },
      `quest:${p.local.id}:haven-cache`,
      at,
      "The Forgotten Cache",
    );
    w.cacheClaimed = true;
    return;
  }
  if (command.type === "tutorial") {
    w.tutorial = false;
    return;
  }
  if (command.type === "travel") {
    if (!resolveEquippedWeapon(p))
      throw new Error("Equip a weapon in Inventory before entering a stage.");
    if (!near(w.position, LANDMARKS.find((l) => l.id === "portal")!.entrance))
      throw new Error("Move closer to interact.");
    if (p.local.checkpoint || p.local.activeRun)
      throw new Error("Recover or discard the saved run before travelling.");
    w.location = "expedition";
    w.position = { ...HAVEN.return };
  }
}
