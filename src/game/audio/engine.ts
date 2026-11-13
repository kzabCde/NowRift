import { defaults, type Preferences } from "@/state/settings";
import { PALETTE, VoiceGate, type SoundId } from "./palette";
import type { WorldId } from "../campaign/content";
export type MusicState =
  | "menu"
  | "character"
  | "exploration"
  | "combat"
  | "boss"
  | "victory"
  | "defeat";
type Voice = {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  priority: number;
  bus: string;
};
const roots: Record<WorldId, number> = {
  forest: 146.83,
  desert: 130.81,
  frozen: 164.81,
  infernal: 98,
};
const scales = [0, 3, 7, 10, 7, 3, 5, 7, 0, 7, 12, 10, 7, 5, 3, 7];
/** One browser-owned context. No React/scene can start a second scheduler. */
export class RiftAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private music?: GainNode;
  private sfx?: GainNode;
  private ambient?: GainNode;
  private layers: GainNode[] = [];
  private retiring: { node: GainNode; until: number }[] = [];
  private analyser?: AnalyserNode;
  private samples = new Float32Array(256);
  private voices = new Set<Voice>();
  private gate = new VoiceGate();
  private timer?: ReturnType<typeof setInterval>;
  private preferences: Preferences = defaults;
  private nextNote = 0;
  private beat = 0;
  private scene: MusicState = "menu";
  private world: WorldId = "forest";
  private district: string | null = null;
  private districtSound = { cutoff: 800, gain: 0.12 };
  private nextAtmosphere = 0;
  private paused = false;
  private hidden = false;
  private mounts = 0;
  private unlockPending?: Promise<void>;
  private detach?: () => void;
  private events: Partial<Record<SoundId, number>> = {};
  private accepted = 0;
  private dropped = 0;
  private transitions = 0;
  private failure = "";
  diagnostics() {
    let signalRms = 0;
    if (this.analyser) {
      this.analyser.getFloatTimeDomainData(this.samples);
      for (const sample of this.samples) signalRms += sample * sample;
      signalRms = Math.sqrt(signalRms / this.samples.length);
    }
    return {
      signalRms,
      context: this.context?.state ?? "locked",
      contexts: this.context ? 1 : 0,
      voices: this.voices.size,
      voiceLimit: 24,
      schedulers: this.timer ? 1 : 0,
      state: this.scene,
      world: this.world,
      district: this.district,
      ambientLoops: [...this.voices].filter((v) => v.bus === "ambient").length,
      paused: this.paused,
      mounts: this.mounts,
      events: { ...this.events },
      accepted: this.accepted,
      dropped: this.dropped,
      transitions: this.transitions,
      retiredLayers: this.retiring.length,
      masterGain: this.master?.gain.value ?? 0,
      muted: this.preferences.muted,
      music: this.preferences.music,
      ambient: this.preferences.ambient,
      sfx: this.preferences.sfx,
      error: this.failure,
    };
  }
  configure(prefs: Preferences) {
    this.preferences = prefs;
    const c = this.context;
    if (!c) return;
    const t = c.currentTime;
    this.master?.gain.setTargetAtTime(
      prefs.muted ? 0 : prefs.master * 0.7,
      t,
      0.035,
    );
    this.music?.gain.setTargetAtTime(
      prefs.music * (this.paused ? 0.22 : 1),
      t,
      0.15,
    );
    this.sfx?.gain.setTargetAtTime(prefs.sfx, t, 0.035);
    this.ambient?.gain.setTargetAtTime(
      prefs.ambient * (this.paused ? 0.25 : 1),
      t,
      0.15,
    );
  }
  async unlock() {
    if (this.hidden) return;
    if (this.unlockPending) return this.unlockPending;
    this.unlockPending = this.open().finally(() => {
      this.unlockPending = undefined;
    });
    return this.unlockPending;
  }
  private async open() {
    try {
      if (!this.context) {
        const Constructor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Constructor) {
          this.failure = "Web Audio is unavailable in this browser.";
          return;
        }
        const c = (this.context = new Constructor());
        this.master = c.createGain();
        const compressor = c.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.ratio.value = 6;
        this.analyser = c.createAnalyser();
        this.analyser.fftSize = 256;
        this.master
          .connect(compressor)
          .connect(this.analyser)
          .connect(c.destination);
        this.music = c.createGain();
        this.music.connect(this.master);
        this.sfx = c.createGain();
        this.sfx.connect(this.master);
        this.ambient = c.createGain();
        this.ambient.connect(this.master);
        c.addEventListener("statechange", () => {
          if (c.state !== "running") this.stopScheduler();
          else if (this.mounts && !this.hidden) this.startScheduler();
        });
        this.configure(this.preferences);
      }
      await this.context.resume();
      if (this.context.state === "running" && this.mounts)
        this.startScheduler();
      this.failure = "";
    } catch {
      this.failure = "Audio is suspended. Tap a button to retry.";
    }
  }
  mount() {
    if (++this.mounts === 1) {
      const gesture = () => {
        void this.unlock();
      };
      const click = (e: Event) => {
        const b = (e.target as Element)?.closest?.(
          "button",
        ) as HTMLButtonElement | null;
        if (!b || b.disabled || b.dataset.silent) return;
        const name = b.textContent ?? "";
        const id = b.dataset.sound as SoundId | undefined;
        this.play(
          id ??
            (/BACK|←|DONE|CLOSE|EXIT|RETURN/i.test(name)
              ? "back"
              : /START|CONTINUE|EMBRACE|CONFIRM/i.test(name)
                ? "confirm"
                : "press"),
        );
      };
      const hover = (e: Event) => {
        const b = (e.target as Element)?.closest?.(
          "button",
        ) as HTMLButtonElement | null;
        if (
          !b ||
          b.disabled ||
          (e instanceof PointerEvent && e.pointerType === "touch")
        )
          return;
        if (e instanceof PointerEvent && b.contains(e.relatedTarget as Node))
          return;
        this.play("hover");
      };
      const visibility = () => {
        this.hidden = document.hidden;
        if (this.hidden) {
          this.stopScheduler();
          this.stopVoices();
          void this.context?.suspend().catch(() => {});
        }
        // A fresh gesture resumes audio; gameplay also remains paused after returning.
      };
      document.addEventListener("pointerdown", gesture, true);
      document.addEventListener("keydown", gesture, true);
      document.addEventListener("click", click);
      document.addEventListener("pointerover", hover);
      document.addEventListener("focusin", hover);
      document.addEventListener("visibilitychange", visibility);
      this.detach = () => {
        document.removeEventListener("pointerdown", gesture, true);
        document.removeEventListener("keydown", gesture, true);
        document.removeEventListener("click", click);
        document.removeEventListener("pointerover", hover);
        document.removeEventListener("focusin", hover);
        document.removeEventListener("visibilitychange", visibility);
      };
    }
    return () => {
      if (--this.mounts > 0) return;
      this.detach?.();
      this.stopScheduler();
      this.stopVoices();
      void this.context?.suspend().catch(() => {});
    };
  }
  setScene(state: MusicState, world: WorldId = "forest", paused = false) {
    const changed = state !== this.scene || world !== this.world;
    if (!changed && paused === this.paused) return;
    this.scene = state;
    this.world = world;
    if (state !== "exploration") this.district = null;
    this.paused = paused;
    this.configure(this.preferences);
    if (changed) {
      this.transitions++;
      this.beat = 0;
      this.nextNote = this.context?.currentTime ?? 0;
      const c = this.context;
      if (c) {
        for (const layer of this.layers) {
          layer.gain.cancelScheduledValues(c.currentTime);
          layer.gain.setTargetAtTime(0, c.currentTime, 0.3);
          this.retiring.push({ node: layer, until: c.currentTime + 2 });
        }
      }
      this.layers = [];
      while (this.retiring.length > 4) this.retiring.shift()!.node.disconnect();
    }
  }
  setDistrict(id: string | null, sound = { cutoff: 800, gain: 0.12 }) {
    if (this.district === id) return;
    this.district = id;
    this.districtSound = {
      cutoff: Math.max(80, Math.min(4000, sound.cutoff)),
      gain: Math.max(0, Math.min(0.25, sound.gain)),
    };
    this.nextAtmosphere = 0;
    if (this.context?.state === "running" && this.scene === "exploration")
      this.ambience();
  }
  play(id: SoundId) {
    const c = this.context,
      def = PALETTE[id];
    if (
      !c ||
      c.state !== "running" ||
      this.hidden ||
      this.preferences.muted ||
      !def
    )
      return false;
    const intensity = this.preferences.audioIntensity;
    const limit =
      intensity === "gentle" ? 8 : intensity === "balanced" ? 14 : 18;
    const live = [...this.voices].filter((v) => v.bus === "sfx");
    if (live.length >= limit && def.priority >= 3) {
      const victim = live
        .filter((v) => v.priority < def.priority)
        .sort((a, b) => a.priority - b.priority)[0];
      if (victim) this.stopVoice(victim);
    }
    const active = [...this.voices].filter((v) => v.bus === "sfx").length;
    if (
      !this.gate.allow(
        id,
        c.currentTime,
        def.cooldown * (intensity === "gentle" ? 1.7 : 1),
        active,
        limit,
      )
    ) {
      this.dropped++;
      return false;
    }
    const variation = 0.97 + Math.random() * 0.06;
    if (this.voices.size >= 24 && def.priority >= 3) {
      const victim = [...this.voices].find(
        (v) => v.priority < def.priority && v.bus !== "ambient",
      );
      if (victim) this.stopVoice(victim);
    }
    if (
      !this.tone(
        def.hz * variation,
        (def.end ?? def.hz) * variation,
        def.duration,
        def.gain * (intensity === "gentle" ? 0.7 : 1),
        def.wave ?? "sine",
        this.sfx!,
        "sfx",
        def.priority,
      )
    ) {
      this.dropped++;
      return false;
    }
    this.accepted++;
    this.events[id] = (this.events[id] ?? 0) + 1;
    return true;
  }
  private tone(
    hz: number,
    end: number,
    seconds: number,
    volume: number,
    wave: OscillatorType,
    bus: AudioNode,
    category: string,
    priority = 0,
    start = this.context!.currentTime,
  ) {
    const c = this.context!;
    if (this.voices.size >= 24) return false;
    const source = c.createOscillator(),
      gain = c.createGain();
    source.type = wave;
    source.frequency.setValueAtTime(hz, start);
    source.frequency.exponentialRampToValueAtTime(
      Math.max(20, end),
      start + seconds,
    );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(
      volume,
      start + Math.min(0.035, seconds * 0.2),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(gain).connect(bus);
    const voice: Voice = { source, gain, priority, bus: category };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    source.start(start);
    source.stop(start + seconds + 0.02);
    return true;
  }
  private startScheduler() {
    if (this.timer) return;
    this.nextNote = this.context!.currentTime;
    this.timer = setInterval(() => this.schedule(), 100);
    this.schedule();
  }
  private stopScheduler() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  private schedule() {
    const c = this.context;
    if (!c || c.state !== "running" || this.hidden) return;
    for (let i = this.retiring.length - 1; i >= 0; i--)
      if (this.retiring[i].until <= c.currentTime) {
        this.retiring[i].node.disconnect();
        this.retiring.splice(i, 1);
      }
    if (!this.layers.length) {
      const layer = c.createGain();
      layer.gain.value = 0;
      layer.connect(this.music!);
      layer.gain.linearRampToValueAtTime(1, c.currentTime + 1.2);
      this.layers.push(layer);
      this.ambience();
    }
    // District details share the existing scheduler and voice cap, including with music disabled.
    if (
      this.district &&
      !this.paused &&
      this.preferences.ambient > 0 &&
      !this.preferences.muted &&
      c.currentTime >= this.nextAtmosphere
    ) {
      const motifs: Record<string, [number, number, number, OscillatorType]> = {
        plaza: [620, 420, 0.35, "sine"],
        emberforge: [210, 95, 0.22, "triangle"],
        market: [290, 360, 0.28, "sine"],
        grove: [1400, 1950, 0.16, "sine"],
        guild: [530, 790, 0.26, "sine"],
        garden: [1850, 1350, 0.2, "sine"],
        gate: [165, 220, 1.1, "sine"],
        training: [180, 90, 0.12, "triangle"],
        hearthside: [440, 660, 0.24, "sine"],
      };
      const motif = motifs[this.district];
      if (motif)
        this.tone(
          motif[0],
          motif[1],
          motif[2],
          0.007,
          motif[3],
          this.ambient!,
          "district",
          0,
        );
      this.nextAtmosphere =
        c.currentTime + (this.district === "emberforge" ? 3.7 : 7.2);
    }
    // Do not schedule silence or a backlog after a browser interruption.
    if (this.preferences.muted || this.preferences.music === 0) {
      this.nextNote = c.currentTime;
      return;
    }
    if (this.nextNote < c.currentTime) this.nextNote = c.currentTime;
    const urgent = this.scene === "boss" || this.scene === "combat";
    const tempo = {
      menu: 1.05,
      character: 0.82,
      exploration: 1.2,
      combat: 0.54,
      boss: 0.36,
      victory: 0.65,
      defeat: 1.4,
    }[this.scene];
    if (this.nextNote > c.currentTime + 0.15) return;
    const root = roots[this.world] * (this.scene === "defeat" ? 0.75 : 1);
    const sequence =
      this.scene === "victory"
        ? [0, 4, 7, 12, 7, 4, 2, 7]
        : this.scene === "character"
          ? [0, 7, 10, 12, 7, 3, 7, 5]
          : this.scene === "defeat"
            ? [7, 5, 3, 0, 0, 3, 0, 0]
            : scales;
    const note = root * 2 ** (sequence[this.beat % sequence.length] / 12);
    this.tone(
      note,
      note,
      tempo * (urgent ? 0.8 : 2),
      0.025,
      "sine",
      this.layers[0],
      "music",
      0,
      this.nextNote,
    );
    if (this.beat % 4 === 0) {
      this.tone(
        root / 2,
        root / 2,
        tempo * 3.8,
        0.035,
        "triangle",
        this.layers[0],
        "music",
        0,
        this.nextNote,
      );
      if (urgent)
        this.tone(
          65,
          26,
          0.22,
          0.035,
          "sine",
          this.layers[0],
          "music",
          0,
          this.nextNote,
        );
    }
    this.beat++;
    this.nextNote += tempo;
  }
  private ambience() {
    const c = this.context!;
    // Crossfade world noise without unbounded looping sources.
    for (const voice of [...this.voices])
      if (voice.bus === "ambient") {
        if ([...this.voices].filter((v) => v.bus === "ambient").length >= 2) {
          this.stopVoice(voice);
          continue;
        }
        voice.gain.gain.setTargetAtTime(0, c.currentTime, 0.3);
        try {
          voice.source.stop(c.currentTime + 1.2);
        } catch {
          /* already stopped */
        }
      }
    if (this.voices.size >= 24) return;
    const size = Math.floor(c.sampleRate * 2),
      buffer = c.createBuffer(1, size, c.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < size; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
      data[i] = brown * 3;
    }
    const source = c.createBufferSource(),
      gain = c.createGain(),
      filter = c.createBiquadFilter();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = this.district
      ? this.districtSound.cutoff
      : {
          forest: 800,
          desert: 1400,
          frozen: 2400,
          infernal: 190,
        }[this.world];
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(
      this.district ? this.districtSound.gain : 0.18,
      c.currentTime + 1.2,
    );
    source.connect(filter).connect(gain).connect(this.ambient!);
    const voice: Voice = { source, gain, priority: 0, bus: "ambient" };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    source.start();
  }
  private stopVoice(v: Voice) {
    try {
      v.source.stop();
    } catch {
      /* stopped */
    }
    v.gain.disconnect();
    this.voices.delete(v);
  }
  private stopVoices() {
    for (const v of [...this.voices]) this.stopVoice(v);
    for (const l of this.layers) l.disconnect();
    for (const l of this.retiring) l.node.disconnect();
    this.layers = [];
    this.retiring = [];
  }
}
export const audio = new RiftAudio();
