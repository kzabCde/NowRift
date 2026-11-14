import type { EnemyKind } from "../content/forest";
import type { LocalizedText } from "../quests/types";
import type { MissionPoint, MissionStep } from "./types";
export const w = (en: string, th: string): LocalizedText => ({ en, th });
const point = (x = 900, y = 560) => ({ x, y, radius: 70 });
export function talk(
  id: string,
  label: LocalizedText,
  dialogue: LocalizedText,
  x = 900,
  y = 560,
): MissionStep {
  return {
    id: id + "-talk",
    type: "TalkToNPC",
    target: id,
    count: 1,
    text: label,
    objects: [
      {
        id: id + "-actor",
        target: id,
        kind: "npc",
        label,
        dialogue,
        ...point(x, y),
      },
    ],
  };
}
export function visit(
  id: string,
  label: LocalizedText,
  x: number,
  y: number,
  discover = true,
): MissionStep {
  return {
    id: id + "-visit",
    type: discover ? "DiscoverArea" : "VisitLocation",
    target: id,
    count: 1,
    text: label,
    objects: [
      {
        id: id + "-landmark",
        target: id,
        kind: "location",
        label,
        ...point(x, y),
      },
    ],
  };
}
export function eliminate(
  id: string,
  kind: EnemyKind,
  count: number,
  text: LocalizedText,
): MissionStep {
  return {
    id,
    type: kind === "boss" ? "DefeatBoss" : "DefeatEnemy",
    target: kind,
    count,
    text,
    objects: [],
  };
}
export function collect(
  id: string,
  item: string,
  text: LocalizedText,
  points: MissionPoint[],
): MissionStep {
  return {
    id,
    type: "CollectItem",
    target: item,
    count: points.length,
    text,
    objects: points.map((p, i) => ({
      id: id + "-" + i,
      target: item,
      kind: "item",
      label: text,
      radius: 66,
      ...p,
    })),
  };
}
export function rescue(
  id: string,
  label: LocalizedText,
  dialogue: LocalizedText,
  x = 1180,
  y = 580,
): MissionStep {
  return {
    id: id + "-rescue",
    type: "RescueNPC",
    target: id,
    count: 1,
    text: label,
    objects: [
      {
        id: id + "-captive",
        target: id,
        kind: "rescue",
        label,
        dialogue,
        ...point(x, y),
      },
    ],
  };
}
export function defense(
  id: string,
  label: LocalizedText,
  seconds = 20,
  x = 900,
  y = 600,
): MissionStep {
  return {
    id: id + "-defense",
    type: "DefendLocation",
    target: id,
    count: seconds,
    text: label,
    objects: [
      { id: id + "-ally", target: id, kind: "ally", label, ...point(x, y) },
    ],
  };
}
export function escort(
  id: string,
  label: LocalizedText,
  start: MissionPoint,
  route: MissionPoint[],
): MissionStep {
  return {
    id: id + "-escort",
    type: "EscortNPC",
    target: id,
    count: 1,
    text: label,
    objects: [
      {
        id: id + "-ally",
        target: id,
        kind: "ally",
        label,
        radius: 70,
        ...start,
        route,
      },
    ],
  };
}
export function puzzle(
  id: string,
  label: LocalizedText,
  x = 700,
  y = 600,
): MissionStep {
  return {
    id: id + "-sequence",
    type: "ActivateMechanism",
    target: id,
    count: 3,
    text: label,
    objects: [0, 1, 2].map((i) => ({
      id: id + "-rune-" + i,
      target: id,
      kind: "mechanism",
      label: w(
        `${label.en} · ${["I", "II", "III"][i]}`,
        `${label.th} · ${["I", "II", "III"][i]}`,
      ),
      order: i,
      radius: 60,
      x: x + i * 175,
      y: y + (i === 1 ? -110 : 0),
    })),
  };
}
export function sabotage(
  id: string,
  label: LocalizedText,
  points: MissionPoint[],
): MissionStep {
  return {
    id: id + "-destroy",
    type: "DestroyObject",
    target: id,
    count: points.length,
    text: label,
    objects: points.map((p, i) => ({
      id: id + "-object-" + i,
      target: id,
      kind: "destructible",
      label,
      radius: 64,
      ...p,
    })),
  };
}
export function champion(
  id: string,
  label: LocalizedText,
  boss = false,
  x = 1120,
  y = 650,
): MissionStep {
  return {
    id: id + "-encounter",
    type: boss ? "DefeatBoss" : "DefeatEnemy",
    target: boss ? "boss" : "elite",
    count: 1,
    text: label,
    objects: [
      {
        id: id + "-foe",
        target: boss ? "boss" : "elite",
        kind: boss ? "boss" : "elite",
        label,
        ...point(x, y),
      },
    ],
  };
}
export function survive(
  id: string,
  text: LocalizedText,
  seconds = 18,
): MissionStep {
  return {
    id,
    type: "SurviveEncounter",
    target: id,
    count: seconds,
    text,
    objects: [],
  };
}
