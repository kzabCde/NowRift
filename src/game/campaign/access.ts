import { WORLDS } from "./content";

export function legacyCampaignAccess(clears: readonly string[]) {
  const access: string[] = [];
  WORLDS.forEach((w, index) => {
    if (
      index === 0 ||
      clears.some((k) => k.startsWith(w.id + "-")) ||
      clears.includes(WORLDS[index - 1].id + "-5:normal")
    )
      access.push(w.id + ":entry");
    if (
      [1, 2, 3, 4, 5].every((n) => clears.includes(`${w.id}-${n}:normal`)) ||
      clears.some((k) => k.startsWith(w.id + "-") && k.endsWith(":hard"))
    )
      access.push(w.id + ":hard");
    if (
      [1, 2, 3, 4, 5].every((n) => clears.includes(`${w.id}-${n}:hard`)) ||
      clears.some((k) => k.startsWith(w.id + "-") && k.endsWith(":nightmare"))
    )
      access.push(w.id + ":nightmare");
  });
  return access;
}
