/** Cosmetic choices are independent of class, inventory ownership and combat stats. */
export const APPEARANCE_CUSTOMIZATION = {
  skin: ["warm", "umber", "pale"],
  hair: ["short", "braid", "crest"],
  face: ["calm", "scar", "vigil"],
} as const;
export type AppearanceCustomization = {
  [K in keyof typeof APPEARANCE_CUSTOMIZATION]: (typeof APPEARANCE_CUSTOMIZATION)[K][number];
};
export const DEFAULT_CUSTOMIZATION: AppearanceCustomization = {
  skin: "warm",
  hair: "short",
  face: "calm",
};
export function validCustomization(
  value: unknown,
): value is AppearanceCustomization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).length === 3 &&
    (
      Object.keys(APPEARANCE_CUSTOMIZATION) as (keyof AppearanceCustomization)[]
    ).every(
      (key) =>
        typeof v[key] === "string" &&
        (APPEARANCE_CUSTOMIZATION[key] as readonly string[]).includes(
          v[key] as string,
        ),
    )
  );
}
