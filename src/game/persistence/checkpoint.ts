import { makeGame, type Game } from "../engine";
import { loadStage, type StageSelection } from "../campaign/loader";
import { seeded, STAGES, DIFFICULTIES } from "../campaign/content";
import {
  ENEMIES,
  FOREST,
  UPGRADES,
  WEAPONS,
  type WeaponId,
} from "../content/forest";
import { CHARACTERS, RELICS, type Loadout } from "../loadout";
import { RARITIES } from "../rpg/content";
import { validProgress, emptyProgress } from "../campaign/progression";
import type { RunOwner } from "./model";
import { validHarvest } from "../world/farming";
import { OUTFITS } from "../world/save";
import { validAppearance as validCharacterAppearance } from "../presentation/appearance";
import { validWeaponSnapshot } from "../rpg/weapon-validation";
type State = Pick<
  Game,
  | "phase"
  | "player"
  | "weapon"
  | "time"
  | "wave"
  | "kills"
  | "gold"
  | "level"
  | "xp"
  | "xpToNext"
  | "regen"
  | "focus"
  | "pickupRadius"
  | "enemies"
  | "bullets"
  | "drops"
  | "hazards"
  | "spawnCooldown"
  | "nextId"
  | "offers"
  | "stacks"
  | "bossSpawned"
  | "build"
  | "appearance"
  | "character"
  | "equippedWeapon"
  | "visualAppearance"
>;
type EnvironmentState = Pick<
  NonNullable<Game["campaign"]>,
  | "harvested"
  | "timer"
  | "slow"
  | "burn"
  | "burnTick"
  | "enemies"
  | "elites"
  | "bosses"
  | "exposure"
>;
export type RunCheckpoint = {
  schema: 1;
  run: RunOwner;
  at: number;
  seed: number;
  random: number;
  weapon: WeaponId;
  stage?: StageSelection;
  loadout?: Loadout;
  state: State;
  environment?: EnvironmentState;
  tonics: string[];
};
const fields = [
  "phase",
  "player",
  "weapon",
  "time",
  "wave",
  "kills",
  "gold",
  "level",
  "xp",
  "xpToNext",
  "regen",
  "focus",
  "pickupRadius",
  "enemies",
  "bullets",
  "drops",
  "hazards",
  "spawnCooldown",
  "nextId",
  "offers",
  "stacks",
  "bossSpawned",
  "build",
  "appearance",
  "character",
  "equippedWeapon",
  "visualAppearance",
] as const;
export function captureCheckpoint(
  g: Game,
  run: RunOwner,
  seed: number,
  stage?: StageSelection,
  loadout?: Loadout,
  tonics: string[] = [],
  at = Date.now(),
): RunCheckpoint {
  const rng = g.rng as ReturnType<typeof seeded>;
  if (!rng.getState)
    throw new Error("This run has no recoverable random state.");
  const state = Object.fromEntries(
    fields.filter((key) => g[key] !== undefined).map((key) => [key, g[key]]),
  ) as State;
  return structuredClone({
    schema: 1,
    run,
    at,
    seed,
    random: rng.getState(),
    weapon: g.weaponId,
    stage:
      stage ??
      (g.campaign
        ? {
            stageId: g.campaign.definition.id,
            difficulty: g.campaign.difficulty.id,
            seed,
            clears: [],
          }
        : undefined),
    loadout,
    state,
    environment: g.campaign
      ? {
          ...(g.campaign.harvested ? { harvested: g.campaign.harvested } : {}),
          timer: g.campaign.timer,
          slow: g.campaign.slow,
          burn: g.campaign.burn,
          burnTick: g.campaign.burnTick,
          enemies: g.campaign.enemies,
          elites: g.campaign.elites,
          bosses: g.campaign.bosses,
          exposure: g.campaign.exposure,
        }
      : undefined,
    tonics,
  });
}
// Property order is not significant in JSON exports or IndexedDB records.
function sameRecord(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const entries = Object.entries(a),
    other = Object.entries(b);
  return (
    entries.length === other.length &&
    entries.every(
      ([key, value]) =>
        Object.hasOwn(b, key) &&
        sameRecord(value, (b as Record<string, unknown>)[key]),
    )
  );
}
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, min = 0, max = 1e12): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min = 0, max = 1e9) =>
  finite(v, min, max) && Number.isSafeInteger(v);
function numbers(
  value: Record<string, unknown>,
  keys: string[],
  min = 0,
  max = 1e12,
) {
  return keys.every((key) => finite(value[key], min, max));
}
function optionalNumbers(value: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => value[key] === undefined || finite(value[key]));
}
export function validCheckpoint(value: unknown): value is RunCheckpoint {
  if (!obj(value)) return false;
  const c = value as unknown as RunCheckpoint,
    s = c.state;
  if (c.stage?.activity !== undefined && c.stage.activity !== "farming")
    return false;
  if (c.stage?.outfit !== undefined && !OUTFITS.includes(c.stage.outfit))
    return false;
  if (c.stage?.startingHp !== undefined && !finite(c.stage.startingHp, 1, 5000))
    return false;
  if (c.stage?.returnTo !== undefined && c.stage.returnTo !== "haven")
    return false;
  if (
    c.environment?.harvested !== undefined &&
    !validHarvest(c.environment.harvested, c.stage?.stageId)
  )
    return false;
  if (
    c.stage?.activity === "farming" &&
    !validHarvest(c.environment?.harvested, c.stage.stageId)
  )
    return false;
  if (
    c.schema !== 1 ||
    !obj(c.run) ||
    typeof c.run.id !== "string" ||
    !c.run.id.length ||
    typeof c.run.slotId !== "string" ||
    typeof c.run.writer !== "string" ||
    !integer(c.run.sequence) ||
    !finite(c.at, 0, 8640000000000000) ||
    !integer(c.seed, 0, 4294967295) ||
    !integer(c.random, 0, 4294967295) ||
    !Object.hasOwn(WEAPONS, c.weapon) ||
    !obj(s)
  )
    return false;
  if (
    !["playing", "paused", "upgrade"].includes(s.phase) ||
    !Object.hasOwn(CHARACTERS, s.character) ||
    !numbers(s, [
      "time",
      "wave",
      "kills",
      "gold",
      "level",
      "xp",
      "xpToNext",
      "regen",
      "focus",
      "pickupRadius",
      "nextId",
    ]) ||
    !finite(s.spawnCooldown, -1e12) ||
    typeof s.bossSpawned !== "boolean"
  )
    return false;
  if (
    !obj(s.player) ||
    !numbers(s.player, [
      "x",
      "y",
      "r",
      "hp",
      "maxHp",
      "speed",
      "invincible",
      "hit",
    ]) ||
    !finite(s.player.angle, -1e12) ||
    s.player.hp <= 0 ||
    s.player.hp > s.player.maxHp ||
    s.player.x > FOREST.width ||
    s.player.y > FOREST.height ||
    typeof s.player.moving !== "boolean" ||
    (s.player.armor !== undefined && !finite(s.player.armor))
  )
    return false;
  if (
    !obj(s.weapon) ||
    !numbers(s.weapon, [
      "damage",
      "delay",
      "projectiles",
      "range",
      "speed",
      "area",
      "crit",
      "critDamage",
    ]) ||
    s.weapon.delay <= 0 ||
    s.weapon.projectiles > 8 ||
    s.weapon.crit > 1 ||
    !finite(s.weapon.cooldown, -1e12)
  )
    return false;
  if (
    !Array.isArray(s.enemies) ||
    s.enemies.length > 500 ||
    !s.enemies.every(
      (e) =>
        obj(e) &&
        Object.hasOwn(ENEMIES, e.kind) &&
        numbers(e, ["id", "x", "y", "r", "hp", "maxHp", "speed"]) &&
        optionalNumbers(e, ["slow", "hit", "age", "pattern"]) &&
        (e.enraged === undefined || typeof e.enraged === "boolean") &&
        finite(e.contact, -1e12) &&
        (e.attack === undefined || finite(e.attack, -1e12)) &&
        (e.charge === undefined ||
          (obj(e.charge) &&
            numbers(e.charge, ["delay", "left", "vx", "vy"], -1e6))),
    )
  )
    return false;
  if (new Set(s.enemies.map((e) => e.id)).size !== s.enemies.length)
    return false;
  if (
    !Array.isArray(s.bullets) ||
    s.bullets.length > 1200 ||
    !s.bullets.every(
      (b) =>
        obj(b) &&
        numbers(b, ["x", "y", "vx", "vy"], -1e6) &&
        numbers(b, ["r", "life", "damage"]) &&
        optionalNumbers(b, ["blast", "sprite"]) &&
        (b.hostile === undefined || typeof b.hostile === "boolean") &&
        (b.critical === undefined || typeof b.critical === "boolean") &&
        typeof b.color === "string",
    )
  )
    return false;
  if (
    !Array.isArray(s.drops) ||
    s.drops.length > 1000 ||
    !s.drops.every(
      (d) =>
        obj(d) &&
        numbers(d, ["x", "y", "r", "value"]) &&
        ["xp", "heal"].includes(d.kind),
    )
  )
    return false;
  if (
    !Array.isArray(s.hazards) ||
    s.hazards.length > 1000 ||
    !s.hazards.every(
      (h) =>
        obj(h) &&
        numbers(h, ["x", "y", "r", "age", "delay", "damage"]) &&
        optionalNumbers(h, ["slow", "burn", "color"]),
    )
  )
    return false;
  if (
    !obj(s.stacks) ||
    !Object.entries(s.stacks).every(([id, n]) =>
      UPGRADES.some((u) => u.id === id && integer(n, 0, u.max)),
    )
  )
    return false;
  if (
    !Array.isArray(s.offers) ||
    s.offers.length > 3 ||
    new Set(s.offers).size !== s.offers.length ||
    !s.offers.every((id) =>
      UPGRADES.some((u) => u.id === id && (s.stacks[id] ?? 0) < u.max),
    ) ||
    (s.phase === "upgrade" && !s.offers.length)
  )
    return false;
  if (
    !Array.isArray(c.tonics) ||
    c.tonics.length > 10000 ||
    !c.tonics.every((id) => typeof id === "string")
  )
    return false;
  if (
    c.loadout &&
    (!Object.hasOwn(CHARACTERS, c.loadout.character) ||
      !integer(c.loadout.rank, 0, 15))
  )
    return false;
  if (
    c.stage &&
    (!STAGES.some((t) => t.id === c.stage!.stageId) ||
      !Object.hasOwn(DIFFICULTIES, c.stage.difficulty) ||
      !validProgress({ ...emptyProgress(), clears: c.stage.clears }) ||
      c.stage.seed !== c.seed ||
      !obj(c.environment) ||
      !numbers(
        c.environment,
        [
          "timer",
          "slow",
          "burn",
          "burnTick",
          "enemies",
          "elites",
          "bosses",
          "exposure",
        ],
        -1e12,
      ))
  )
    return false;
  const validBuild = (build: unknown) =>
    obj(build) &&
    numbers(build, [
      "maxHp",
      "damage",
      "attackSpeed",
      "critChance",
      "critDamage",
      "armor",
      "speed",
      "regen",
      "projectiles",
      "area",
      "interval",
      "level",
      "power",
    ]) &&
    Number(build.interval) >= 0.12 &&
    Number(build.maxHp) > 0 &&
    Number(build.projectiles) <= 8;
  const validAppearance = (appearance: unknown) =>
    obj(appearance) &&
    typeof appearance.rarity === "string" &&
    Object.hasOwn(RARITIES, appearance.rarity) &&
    integer(appearance.icon, 0, 47);
  if (s.build && !validBuild(s.build)) return false;
  if (
    s.equippedWeapon !== undefined &&
    (!validWeaponSnapshot(s.equippedWeapon) ||
      s.equippedWeapon.attackId !== c.weapon ||
      !sameRecord(s.equippedWeapon.stats, s.build))
  )
    return false;
  if (
    c.stage?.weaponSnapshot !== undefined &&
    (!validWeaponSnapshot(c.stage.weaponSnapshot) ||
      !sameRecord(c.stage.weaponSnapshot, s.equippedWeapon))
  )
    return false;
  if (
    c.stage?.character !== undefined &&
    !Object.hasOwn(CHARACTERS, c.stage.character)
  )
    return false;
  if (
    s.player.facing !== undefined &&
    !["down", "right", "up", "left"].includes(s.player.facing)
  )
    return false;
  if (s.player.attackUntil !== undefined && !finite(s.player.attackUntil))
    return false;
  if (s.player.attackAngle !== undefined && !finite(s.player.attackAngle, -10))
    return false;
  if (
    s.visualAppearance !== undefined &&
    (!validCharacterAppearance(s.visualAppearance) ||
      s.visualAppearance.character !== s.character)
  )
    return false;
  if (
    c.stage?.visualAppearance !== undefined &&
    (!validCharacterAppearance(c.stage.visualAppearance) ||
      !sameRecord(c.stage.visualAppearance, s.visualAppearance))
  )
    return false;
  if (s.appearance && !validAppearance(s.appearance)) return false;
  if (c.stage?.build && !validBuild(c.stage.build)) return false;
  if (c.stage?.appearance && !validAppearance(c.stage.appearance)) return false;
  if (c.loadout?.relic && !Object.hasOwn(RELICS, c.loadout.relic)) return false;
  if (!integer(s.nextId, 1) || s.enemies.some((e) => e.id >= s.nextId))
    return false;

  return true;
}
export function restoreCheckpoint(checkpoint: RunCheckpoint): Game {
  if (!validCheckpoint(checkpoint))
    throw new Error(
      "The run checkpoint is damaged. Keep the save and discard only this checkpoint to continue.",
    );
  const c = structuredClone(checkpoint),
    rng = seeded(c.seed),
    g = c.stage
      ? loadStage(c.stage, c.weapon)
      : makeGame(FOREST.width, FOREST.height, c.weapon, rng);
  Object.assign(g, c.state);
  g.id = c.run.id;
  if (g.campaign && c.environment) Object.assign(g.campaign, c.environment);
  rng.setState(c.random);
  g.rng = rng;
  g.phase = c.state.phase === "upgrade" ? "upgrade" : "paused";
  g.player.moving = false;
  g.sparks = [];
  g.texts = [];
  g.feedback = [];
  return g;
}
