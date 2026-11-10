import type { ExportFile, SaveBundle, SaveData, PlayerProfile } from "./model";
import { record, safeJson, validPlayer, migrateSave } from "./validation";
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
      .join(",") +
    "}"
  );
}
export async function checksum(value: unknown) {
  const bytes = new TextEncoder().encode(canonical(value)),
    digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function exportSave(
  player: PlayerProfile,
  save: SaveData,
  at = Date.now(),
): Promise<string> {
  const payload: SaveBundle = JSON.parse(
    JSON.stringify({
      format: "nowrift-save",
      version: 2,
      exportedAt: at,
      player: {
        id: player.id,
        username: player.username,
        createdAt: player.createdAt,
        checkins: player.checkins,
      },
      save,
    }),
  );
  const encoded = JSON.stringify(
    {
      format: "nowrift-backup",
      checksum: await checksum(payload),
      payload,
    } satisfies ExportFile,
    null,
    2,
  );
  if (new TextEncoder().encode(encoded).length > MAX_IMPORT_BYTES)
    throw new Error(
      "This backup exceeds the 5 MB import limit. Existing saves were preserved.",
    );
  return encoded;
}
export async function importSave(text: string): Promise<SaveBundle> {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new Error("Save files must be smaller than 5 MB.");
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error(
      "This file is not valid JSON. Your saves were not changed.",
    );
  }
  if (
    !safeJson(file) ||
    !record(file) ||
    file.format !== "nowrift-backup" ||
    typeof file.checksum !== "string" ||
    !record(file.payload)
  )
    throw new Error("This is not a supported NowRift backup.");
  const payload = file.payload;
  if (
    payload.format !== "nowrift-save" ||
    ![1, 2].includes(payload.version as number)
  )
    throw new Error(
      "This save version is incompatible. Update NowRift before importing it.",
    );
  if (
    !/^[0-9a-f]{64}$/.test(file.checksum) ||
    (await checksum(payload)) !== file.checksum
  )
    throw new Error(
      "The checksum does not match. This file may be incomplete or corrupted.",
    );
  if (
    !record(payload.player) ||
    !Number.isSafeInteger(payload.exportedAt) ||
    !record(payload.save)
  )
    throw new Error("Save metadata is incomplete.");
  const metadata = payload.player;
  const root = {
    ...metadata,
    schema: 2,
    revision: 0,
    activeSlotId: "import-preview",
    slots: [{ id: "import-preview", key: "profile" }],
  };
  if (!validPlayer(root))
    throw new Error("The backup contains invalid player metadata.");
  if (payload.version === 2 && !record(payload.save.local))
    throw new Error("The character metadata is missing.");
  const local = payload.save.local,
    id =
      record(local) && typeof local.id === "string"
        ? local.id
        : "import-preview";
  const save = migrateSave(
    payload.save,
    id,
    payload.exportedAt as number,
    "Imported Wanderer",
  );
  if (
    save.local.checkpoint &&
    save.receipts.includes(save.local.checkpoint.run.id)
  )
    throw new Error("This checkpoint's rewards were already settled.");
  return {
    format: "nowrift-save",
    version: 2,
    exportedAt: payload.exportedAt as number,
    player: metadata as unknown as SaveBundle["player"],
    save,
  };
}
export function downloadJson(contents: string, filename: string) {
  const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
