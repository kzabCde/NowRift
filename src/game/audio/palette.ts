/** Original procedural palette; no samples or third-party music. */
export type SoundId =
  | "hover"
  | "press"
  | "confirm"
  | "back"
  | "error"
  | "unlock"
  | "equip"
  | "upgrade"
  | "step"
  | "attack"
  | "critical"
  | "damage"
  | "heal"
  | "level"
  | "death"
  | "ability"
  | "launch"
  | "impact"
  | "explosion"
  | "magic"
  | "ice"
  | "fire"
  | "lightning"
  | "shield"
  | "enemyHit"
  | "enemyDeath"
  | "bossIntro"
  | "anticipation"
  | "heavy"
  | "phase"
  | "bossDeath"
  | "pickup";
export type Tone = {
  hz: number;
  end?: number;
  duration: number;
  gain: number;
  wave?: OscillatorType;
  priority: number;
  cooldown: number;
};
export const PALETTE: Record<SoundId, Tone> = {
  hover: {
    hz: 420,
    end: 480,
    duration: 0.045,
    gain: 0.025,
    priority: 0,
    cooldown: 0.09,
  },
  press: {
    hz: 220,
    end: 140,
    duration: 0.065,
    gain: 0.06,
    priority: 2,
    cooldown: 0.05,
  },
  confirm: {
    hz: 392,
    end: 587,
    duration: 0.23,
    gain: 0.07,
    priority: 3,
    cooldown: 0.1,
  },
  back: {
    hz: 330,
    end: 196,
    duration: 0.15,
    gain: 0.05,
    priority: 2,
    cooldown: 0.1,
  },
  error: {
    hz: 110,
    end: 90,
    duration: 0.16,
    gain: 0.07,
    wave: "triangle",
    priority: 3,
    cooldown: 0.3,
  },
  unlock: {
    hz: 392,
    end: 784,
    duration: 0.6,
    gain: 0.07,
    priority: 4,
    cooldown: 0.8,
  },
  equip: {
    hz: 294,
    end: 440,
    duration: 0.16,
    gain: 0.07,
    priority: 3,
    cooldown: 0.1,
  },
  upgrade: {
    hz: 440,
    end: 880,
    duration: 0.3,
    gain: 0.07,
    priority: 4,
    cooldown: 0.3,
  },
  step: {
    hz: 58,
    end: 36,
    duration: 0.045,
    gain: 0.025,
    wave: "triangle",
    priority: 0,
    cooldown: 0.32,
  },
  attack: {
    hz: 230,
    end: 90,
    duration: 0.1,
    gain: 0.05,
    wave: "triangle",
    priority: 1,
    cooldown: 0.12,
  },
  critical: {
    hz: 740,
    end: 280,
    duration: 0.12,
    gain: 0.075,
    wave: "triangle",
    priority: 3,
    cooldown: 0.12,
  },
  damage: {
    hz: 130,
    end: 48,
    duration: 0.24,
    gain: 0.13,
    wave: "triangle",
    priority: 5,
    cooldown: 0.35,
  },
  heal: {
    hz: 330,
    end: 660,
    duration: 0.35,
    gain: 0.07,
    priority: 3,
    cooldown: 0.25,
  },
  level: {
    hz: 294,
    end: 880,
    duration: 0.65,
    gain: 0.085,
    priority: 5,
    cooldown: 0.6,
  },
  death: {
    hz: 147,
    end: 36,
    duration: 1.2,
    gain: 0.1,
    wave: "triangle",
    priority: 6,
    cooldown: 2,
  },
  ability: {
    hz: 196,
    end: 784,
    duration: 0.35,
    gain: 0.07,
    priority: 3,
    cooldown: 0.3,
  },
  launch: {
    hz: 520,
    end: 260,
    duration: 0.1,
    gain: 0.04,
    priority: 1,
    cooldown: 0.14,
  },
  impact: {
    hz: 180,
    end: 55,
    duration: 0.09,
    gain: 0.045,
    wave: "triangle",
    priority: 1,
    cooldown: 0.08,
  },
  explosion: {
    hz: 85,
    end: 26,
    duration: 0.4,
    gain: 0.11,
    wave: "triangle",
    priority: 3,
    cooldown: 0.18,
  },
  magic: {
    hz: 587,
    end: 294,
    duration: 0.18,
    gain: 0.045,
    priority: 1,
    cooldown: 0.14,
  },
  ice: {
    hz: 1174,
    end: 587,
    duration: 0.3,
    gain: 0.04,
    priority: 2,
    cooldown: 0.25,
  },
  fire: {
    hz: 100,
    end: 42,
    duration: 0.22,
    gain: 0.065,
    wave: "triangle",
    priority: 2,
    cooldown: 0.2,
  },
  lightning: {
    hz: 1760,
    end: 70,
    duration: 0.13,
    gain: 0.055,
    wave: "sawtooth",
    priority: 3,
    cooldown: 0.18,
  },
  shield: {
    hz: 660,
    end: 220,
    duration: 0.2,
    gain: 0.06,
    priority: 3,
    cooldown: 0.25,
  },
  enemyHit: {
    hz: 150,
    end: 75,
    duration: 0.07,
    gain: 0.03,
    wave: "triangle",
    priority: 0,
    cooldown: 0.1,
  },
  enemyDeath: {
    hz: 190,
    end: 45,
    duration: 0.17,
    gain: 0.04,
    wave: "triangle",
    priority: 1,
    cooldown: 0.15,
  },
  bossIntro: {
    hz: 55,
    end: 98,
    duration: 1.5,
    gain: 0.12,
    wave: "triangle",
    priority: 6,
    cooldown: 3,
  },
  anticipation: {
    hz: 196,
    end: 294,
    duration: 0.4,
    gain: 0.065,
    priority: 5,
    cooldown: 0.65,
  },
  heavy: {
    hz: 65,
    end: 24,
    duration: 0.5,
    gain: 0.12,
    wave: "triangle",
    priority: 4,
    cooldown: 0.3,
  },
  phase: {
    hz: 98,
    end: 196,
    duration: 0.8,
    gain: 0.1,
    wave: "triangle",
    priority: 5,
    cooldown: 1.5,
  },
  bossDeath: {
    hz: 147,
    end: 440,
    duration: 1.6,
    gain: 0.12,
    priority: 6,
    cooldown: 3,
  },
  pickup: {
    hz: 880,
    end: 1108,
    duration: 0.065,
    gain: 0.025,
    priority: 0,
    cooldown: 0.12,
  },
};
/** Monotonic time supplied by the audio clock. Quiet collisions never displace alerts. */
export class VoiceGate {
  last = new Map<string, number>();
  allow(
    id: string,
    now: number,
    cooldown: number,
    active: number,
    limit: number,
  ) {
    if (active >= limit || now - (this.last.get(id) ?? -Infinity) < cooldown)
      return false;
    this.last.set(id, now);
    return true;
  }
}
