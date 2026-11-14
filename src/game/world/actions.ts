import { calculateStats, resolveEquippedWeapon } from "../rpg/stats";
import { grantGift } from "../persistence/daily";
import type { SaveData } from "../persistence/model";
import { near, validPosition } from "./content";
import { cityBounds, regionalCity } from "./regional-city";
import {
  currentRegion,
  defaultExploration,
  emptyFog,
  mergeFog,
  revealFog,
} from "./exploration";
import { regionById, isRegionId } from "./regions";
import { worldById } from "../campaign/content";
import {
  fastTravelReason,
  waypoint,
  waypointLanding,
  waypointRegion,
  waypointsIn,
} from "./waypoints";
import { OUTFITS, type WorldCommand } from "./save";
import { validCustomization } from "../presentation/customization";
export function applyWorldCommand(
  p: SaveData,
  command: WorldCommand,
  at: number,
) {
  const w = p.local.world!;
  const region = currentRegion(w),
    HAVEN = cityBounds(region),
    LANDMARKS = regionalCity(region).landmarks;
  w.atlas ??= defaultExploration(w.position);
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
    const epoch = command.epoch ?? 0;
    if (!Number.isSafeInteger(epoch) || epoch < 0)
      throw new Error("Invalid position epoch.");
    if (epoch < w.positionEpoch) return;
    if (epoch !== w.positionEpoch)
      throw new Error("This position belongs to a different city arrival.");
    if (
      !Number.isSafeInteger(command.sequence) ||
      command.sequence <= w.sequence
    )
      return;
    if (!validPosition(command.position, region))
      throw new Error("That position is blocked. Return to the plaza.");
    const fog = w.atlas.explored[region] ?? emptyFog(region);
    w.atlas.explored[region] = revealFog(
      command.explored === undefined
        ? fog
        : mergeFog(fog, command.explored, region),
      region,
      command.position,
    );
    w.position = { ...command.position };
    w.sequence = command.sequence;
    return;
  }
  if (command.type === "fast-travel") {
    const blocked = fastTravelReason(
      w,
      command.waypointId,
      { clears: p.clears, legacy: p.local.journal?.legacyAccess },
      command.viaGate,
    );
    if (blocked) throw new Error(blocked);
    if (
      !Number.isSafeInteger(command.expectedEpoch) ||
      command.expectedEpoch !== w.positionEpoch
    )
      throw new Error(
        "The city position changed. Reopen the Town Map and try again.",
      );
    const destination = waypoint(command.waypointId)!;
    const arriving = waypointRegion(destination.id);
    if (arriving !== region && (p.local.checkpoint || p.local.activeRun))
      throw new Error("Recover or discard the saved run before travelling.");
    const landing = waypointLanding(destination);
    if (!landing)
      throw new Error(
        "This waypoint has no safe landing. Follow its route instead.",
      );
    w.position = { ...landing };
    w.atlas.region = arriving;
    w.atlas.explored[arriving] = revealFog(
      w.atlas.explored[arriving] ?? emptyFog(arriving),
      arriving,
      landing,
    );
    if (!w.waypoints.includes(destination.id)) w.waypoints.push(destination.id);
    if (!w.discoveries.includes(destination.landmarkId))
      w.discoveries.push(destination.landmarkId);
    w.positionEpoch++;
    w.sequence++;
    return;
  }
  if (command.type === "mark-location") {
    if (command.expectedEpoch !== w.positionEpoch || w.location !== "haven")
      throw new Error(
        "The city position changed. Reopen the Town Map and try again.",
      );
    if (command.destination) {
      const target = command.destination;
      if (!isRegionId(target.region))
        throw new Error("Unknown map destination.");
      const destination = regionalCity(target.region)?.landmarks.find(
        (l) => l.id === target.landmarkId,
      );
      if (
        !destination ||
        (["treasure", "lore"].includes(destination.kind) &&
          !w.discoveries.includes(destination.id))
      )
        throw new Error("Unknown map destination.");
    }
    w.atlas.destination = command.destination
      ? { ...command.destination }
      : null;
    return;
  }
  if (command.type === "visit") {
    const l = LANDMARKS.find((l) => l.id === command.id);
    if (
      !l ||
      w.location !== "haven" ||
      !validPosition(command.position, region) ||
      !near(command.position, l.entrance)
    )
      throw new Error("Move closer to interact.");
    w.position = { ...command.position };
    if (!w.discoveries.includes(l.id)) w.discoveries.push(l.id);
    w.atlas.explored[region] = revealFog(
      w.atlas.explored[region] ?? emptyFog(region),
      region,
      command.position,
    );
    for (const destination of waypointsIn(region))
      if (
        (destination.initial ||
          destination.unlocksFrom.includes(l.id) ||
          l.waypointId === destination.id) &&
        !w.waypoints.includes(destination.id)
      )
        w.waypoints.push(destination.id);
    return;
  }
  if (command.type === "outfit") {
    if (!OUTFITS.includes(command.outfit))
      throw new Error("Invalid appearance.");
    w.outfit = command.outfit;
    return;
  }
  if (command.type === "appearance") {
    if (
      !OUTFITS.includes(command.outfit) ||
      !validCustomization(command.customization)
    )
      throw new Error("Invalid appearance.");
    w.outfit = command.outfit;
    w.customization = { ...command.customization };
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
    const id = command.landmarkId ?? "cache",
      cache = LANDMARKS.find((l) => l.id === id && l.kind === "treasure");
    if ((region === "central" && w.cacheClaimed) || w.atlas.caches.includes(id))
      throw new Error("This cache was already collected.");
    if (!cache || !near(w.position, cache.entrance))
      throw new Error("Move closer to interact.");
    grantGift(
      p,
      {
        gold: 30,
        materials:
          region === "central"
            ? { wood: 2 }
            : { [worldById(regionById(region).worldId).materials[0]]: 2 },
      },
      region === "central"
        ? `quest:${p.local.id}:haven-cache`
        : `quest:${p.local.id}:${id}`,
      at,
      "The Forgotten Cache",
    );
    if (region === "central") w.cacheClaimed = true;
    else w.atlas.caches.push(id);
    return;
  }
  if (command.type === "tutorial") {
    w.tutorial = false;
    return;
  }
  if (command.type === "travel") {
    if (!resolveEquippedWeapon(p))
      throw new Error("Equip a weapon in Inventory before entering a stage.");
    if (!near(w.position, LANDMARKS.find((l) => l.kind === "portal")!.entrance))
      throw new Error("Move closer to interact.");
    if (p.local.checkpoint || p.local.activeRun)
      throw new Error("Recover or discard the saved run before travelling.");
    w.location = "expedition";
    w.position = { ...HAVEN.return };
  }
}
