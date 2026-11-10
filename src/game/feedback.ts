/** Semantic, bounded simulation → presentation queue. This module has no browser dependency. */
export type EffectKind =
  | "slash"
  | "trail"
  | "spark"
  | "magic"
  | "shockwave"
  | "explosion"
  | "burn"
  | "freeze"
  | "poison"
  | "lightning"
  | "shield"
  | "heal"
  | "level"
  | "rare"
  | "bossSpawn"
  | "telegraph"
  | "bossDeath"
  | "damage"
  | "death"
  | "pickup"
  | "phase"
  | "step";
export type Feedback = {
  kind: EffectKind;
  x: number;
  y: number;
  color: number;
  radius: number;
  angle: number;
  tx: number;
  ty: number;
  important: boolean;
};
export type FeedbackQueue = { feedback: Feedback[]; feedbackPool: Feedback[] };
export function feedback(
  g: FeedbackQueue,
  kind: EffectKind,
  x: number,
  y: number,
  color = 0xb5dfd2,
  radius = 24,
  angle = 0,
  important = false,
  tx = x,
  ty = y,
) {
  if (g.feedback.length >= 128) {
    if (!important) return;
    const index = g.feedback.findIndex((e) => !e.important);
    if (index < 0) return;
    g.feedbackPool.push(g.feedback.splice(index, 1)[0]);
  }
  const event = g.feedbackPool.pop() ?? ({} as Feedback);
  Object.assign(event, { kind, x, y, color, radius, angle, important, tx, ty });
  g.feedback.push(event);
}
export function drainFeedback(
  g: FeedbackQueue,
  consume: (event: Feedback) => void,
) {
  for (const event of g.feedback) {
    consume(event);
    g.feedbackPool.push(event);
  }
  g.feedback.length = 0;
}
