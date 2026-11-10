export const BEST_SCORE_KEY = "nowrift-phase1-best-kills";
export function parseBestKills(raw: string | null) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
