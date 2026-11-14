export const COMBAT_SPEEDS = [1, 2, 4] as const;
export type CombatSpeed = (typeof COMBAT_SPEEDS)[number];
export const FIXED_STEP = 1 / 60;
export const MAX_FRAME_STEPS = 16;
export const MAX_ACTIVE_FRAME = 0.25;

/** Simulation budget only. It never modifies Date, Phaser's renderer or browser/audio clocks. */
export class CombatClock {
  private budget = 0;
  reset() {
    this.budget = 0;
  }
  advance(
    realSeconds: number,
    speed: CombatSpeed,
    active: boolean,
    step: (seconds: number) => boolean,
  ) {
    const result = {
      steps: 0,
      realSeconds: 0,
      simulationSeconds: 0,
      limited: false,
    };
    if (!active || !Number.isFinite(realSeconds) || realSeconds <= 0) {
      this.reset();
      return result;
    }
    // A stalled/sleeping frame is neither caught up nor credited as active playtime.
    if (realSeconds > MAX_ACTIVE_FRAME) {
      this.reset();
      result.limited = true;
      return result;
    }
    result.realSeconds = realSeconds;
    this.budget += realSeconds * speed;
    const available = Math.floor((this.budget + 1e-9) / FIXED_STEP),
      count = Math.min(MAX_FRAME_STEPS, available);
    if (available > MAX_FRAME_STEPS) {
      this.budget %= FIXED_STEP;
      result.limited = true;
    } else this.budget -= count * FIXED_STEP;
    if (Math.abs(this.budget) < 1e-9) this.budget = 0;
    for (let i = 0; i < count; i++) {
      result.steps++;
      result.simulationSeconds += FIXED_STEP;
      if (!step(FIXED_STEP)) {
        this.reset();
        break;
      }
    }
    return result;
  }
}
export function nextCombatSpeed(value: CombatSpeed): CombatSpeed {
  return COMBAT_SPEEDS[
    (COMBAT_SPEEDS.indexOf(value) + 1) % COMBAT_SPEEDS.length
  ];
}
