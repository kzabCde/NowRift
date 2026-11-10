/** Short original synthesized cues; no remote audio or copyrighted samples. */
export function enhancementSound(context: AudioContext, success: boolean) {
  const start = context.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = success ? "sine" : "triangle";
    osc.frequency.value = (success ? [440, 554, 660] : [260, 210, 165])[i];
    gain.gain.setValueAtTime(0.035, start + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, start + i * 0.09 + 0.2);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start + i * 0.09);
    osc.stop(start + i * 0.09 + 0.21);
  }
}
