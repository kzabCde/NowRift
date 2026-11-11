/** Keep the existing 24 UTF-16-unit save limit; support Thai combining marks and NFC input. */
export function characterName(value: string): string {
  const normalized = value.trim().normalize("NFC");
  if (!normalized || normalized.length > 24)
    throw new Error("Use a name from 1 to 24 characters.");
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(normalized))
    throw new Error("Names cannot contain hidden control characters.");
  if (!/[\p{L}\p{N}]/u.test(normalized))
    throw new Error("Use at least one letter or number.");
  return normalized;
}
