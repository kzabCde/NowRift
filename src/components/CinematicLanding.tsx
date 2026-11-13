"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useSettings } from "@/state/settings";
import { useI18n } from "@/i18n/useI18n";
import { Brand } from "./GameUi";
import LanguageSwitcher from "./LanguageSwitcher";
import PwaControls from "./PwaControls";
import SaveIndicator from "./SaveIndicator";
import styles from "./CinematicLanding.module.css";

const FEATURES = [
  {
    id: "haven",
    label: "RIFT HEAVEN",
    title: "Your World. Your Sanctuary.",
    description:
      "Explore your home world, prepare equipment, interact with stations and begin your next adventure.",
    alt: "Actual Rift Heaven gameplay",
    note: "A HOME BETWEEN ADVENTURES",
    width: 900,
    height: 478,
  },
  {
    id: "story",
    label: "STORY ADVENTURES",
    title: "Face the Worlds Beyond.",
    description:
      "Enter dangerous regions, overcome challenges and defeat powerful guardians.",
    alt: "Forest Guardian encounter",
    note: "FOUR WORLDS · TWENTY STAGES",
    width: 900,
    height: 480,
  },
  {
    id: "exploration",
    label: "FREE EXPLORATION",
    title: "Explore. Gather. Return.",
    description:
      "Collect supplies through repeatable expeditions and return to Rift Heaven with your rewards.",
    alt: "Lost Desert world artwork",
    note: "SUPPLY EXPEDITIONS · EXTRACT TO KEEP LOOT",
    width: 720,
    height: 405,
  },
  {
    id: "progression",
    label: "CHARACTER PROGRESSION",
    title: "Every Adventure Makes You Stronger.",
    description:
      "Develop your character, equip discovered weapons and improve your build through persistent progression.",
    alt: "Equipped character and inventory",
    note: "SIX EQUIPMENT SLOTS · LOCAL PROGRESSION",
    width: 900,
    height: 486,
  },
] as const;

const FIREFLIES = Array.from({ length: 18 }, (_, i) => ({
  left: `${9 + ((i * 37) % 83)}%`,
  top: `${20 + ((i * 23) % 68)}%`,
  delay: `${-(i * 1.7)}s`,
  duration: `${8 + (i % 5) * 2}s`,
}));

/** Pointer work runs only on input/resize. CSS owns decorative animation clocks. */
function useCinematicMotion(reduced: boolean, quality: string) {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = root.current,
      scene = hero.current;
    if (!container || !scene) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null,
      point: { x: number; y: number } | null = null,
      inView = true;
    const canMove = () =>
      !reduced &&
      quality !== "low" &&
      !media.matches &&
      !document.hidden &&
      inView;
    const draw = () => {
      frame = null;
      const bounds = scene.getBoundingClientRect();
      const x =
        canMove() && point
          ? Math.max(
              -1,
              Math.min(1, ((point.x - bounds.left) / bounds.width) * 2 - 1),
            ) * 10
          : 0;
      const y =
        canMove() && point
          ? Math.max(
              -1,
              Math.min(1, ((point.y - bounds.top) / bounds.height) * 2 - 1),
            ) * 7
          : 0;
      scene.style.setProperty("--pointer-x", `${x.toFixed(2)}px`);
      scene.style.setProperty("--pointer-y", `${y.toFixed(2)}px`);
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(draw);
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !canMove()) return;
      point = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const reset = () => {
      point = null;
      schedule();
    };
    const pause = () => {
      scene.dataset.paused = String(document.hidden || !inView);
      if (!canMove()) reset();
    };
    // CSS sizes/framing must be correct before hydration to avoid a scene shift.
    const resizeObserver = new ResizeObserver(reset);
    resizeObserver.observe(scene);
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        pause();
      },
      { threshold: 0.05 },
    );
    heroObserver.observe(scene);
    const reveals = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = "true";
            reveals.unobserve(entry.target);
          }
      },
      { threshold: 0.12 },
    );
    container.dataset.reveals = String(
      !reduced && !media.matches && quality !== "low",
    );
    container
      .querySelectorAll("[data-reveal]")
      .forEach((element) => reveals.observe(element));
    const motionChange = () => {
      container.dataset.reveals = String(
        !reduced && !media.matches && quality !== "low",
      );
      reset();
    };
    scene.addEventListener("pointermove", pointer, { passive: true });
    scene.addEventListener("pointerleave", reset, { passive: true });
    document.addEventListener("visibilitychange", pause);
    media.addEventListener("change", motionChange);
    reset();
    pause();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      heroObserver.disconnect();
      reveals.disconnect();
      scene.removeEventListener("pointermove", pointer);
      scene.removeEventListener("pointerleave", reset);
      document.removeEventListener("visibilitychange", pause);
      media.removeEventListener("change", motionChange);
    };
  }, [reduced, quality]);
  return { root, hero };
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M11 4 6 8H3v8h3l5 4V4Z" />
      {muted ? (
        <path d="m16 9 6 6m0-6-6 6" />
      ) : (
        <>
          <path d="M15 8a6 6 0 0 1 0 8" />
          <path d="M18 5a10 10 0 0 1 0 14" />
        </>
      )}
    </svg>
  );
}

export default function CinematicLanding({
  onPlay,
  onPractice,
  onSettings,
  onManual,
}: {
  onPlay: () => void;
  onPractice: () => void;
  onSettings: () => void;
  onManual: () => void;
}) {
  const { t } = useI18n(),
    reduced = useSettings((s) => s.reducedEffects),
    quality = useSettings((s) => s.quality);
  const muted = useSettings((s) => s.muted),
    particles = useSettings((s) => s.particles);
  const { root, hero } = useCinematicMotion(reduced, quality);
  const [interactive, setInteractive] = useState(false);
  // SSR can display these buttons before their client handlers are attached.
  useEffect(() => setInteractive(true), []);
  const [artFailed, setArtFailed] = useState(false);
  const explore = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("worlds-beyond");
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior:
        reduced || matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
    target.focus({ preventScroll: true });
  };
  const count =
    reduced || quality === "low"
      ? 0
      : Math.round((quality === "high" ? 18 : 12) * particles);
  return (
    <div
      ref={root}
      className={styles.root}
      data-landing
      aria-busy={!interactive}
      data-motion={reduced || quality === "low" ? "off" : "on"}
    >
      <a className={styles.skip} href="#start-adventure">
        {t("landing", "Skip to Play")}
      </a>
      <section
        ref={hero}
        className={styles.hero}
        aria-labelledby="landing-title"
        data-cinematic-hero
      >
        <div className={styles.environment} aria-hidden="true">
          <div className={styles.artboard}>
            <div
              className={`${styles.plane} ${styles.backdrop}`}
              data-depth="backdrop"
              style={
                artFailed
                  ? { backgroundImage: 'url("/assets/forest/key-art.png")' }
                  : undefined
              }
            >
              {!artFailed && (
                <Image
                  src="/assets/landing/forest.webp"
                  alt=""
                  fill
                  sizes="100vw"
                  priority
                  unoptimized
                  onError={() => setArtFailed(true)}
                />
              )}
            </div>
            <div
              className={`${styles.plane} ${styles.distant}`}
              data-depth="ruins"
            >
              <Image
                src="/assets/worlds/desert/tree.png"
                width={64}
                height={80}
                alt=""
                unoptimized
              />
            </div>
            <div
              className={`${styles.plane} ${styles.forest}`}
              data-depth="forest"
            >
              <Image
                src="/assets/worlds/forest/tree.png"
                width={64}
                height={80}
                alt=""
                unoptimized
              />
            </div>
            <div className={`${styles.plane} ${styles.rift}`} data-depth="rift">
              <div className={styles.portalGlow} />
              <div className={styles.portal} />
            </div>
            <div
              className={`${styles.plane} ${styles.foreground}`}
              data-depth="foreground"
            >
              <Image
                src="/assets/landing/foreground.webp"
                alt=""
                fill
                sizes="100vw"
                unoptimized
              />
            </div>
            <div
              className={`${styles.plane} ${styles.mist}`}
              data-depth="atmosphere"
            />
          </div>
          <div className={styles.shade} />
          <div className={styles.fireflies}>
            {FIREFLIES.slice(0, count).map((p, i) => (
              <i
                key={i}
                style={{
                  left: p.left,
                  top: p.top,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}
          </div>
        </div>
        <header className={`${styles.header} topbar`}>
          <Brand />
          <nav className={styles.tools} aria-label={t("landing", "Main menu")}>
            <LanguageSwitcher compact />
            <button
              className={styles.sound}
              aria-label={t("landing", muted ? "Unmute sound" : "Mute sound")}
              aria-pressed={muted}
              onClick={() => useSettings.getState().set({ muted: !muted })}
              disabled={!interactive}
              type="button"
            >
              <SoundIcon muted={muted} />
              <span>{t("landing", muted ? "Sound off" : "Sound on")}</span>
            </button>
            <button
              className={styles.settings}
              aria-label={t("main", "Settings")}
              onClick={onSettings}
              disabled={!interactive}
              type="button"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  d="m9 3 1-2h4l1 2 3 2 2 1v4l-2 1v3l2 1v4l-2 1-3 2-1 2h-4l-1-2-3-2-2-1v-4l2-1v-3l-2-1V6l2-1 3-2Z"
                  transform="translate(0 1) scale(1 .9)"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{t("main", "SETTINGS")}</span>
            </button>
          </nav>
        </header>
        <div className={styles.heroInner}>
          <div className={styles.menu}>
            <Image
              src="/branding/nowrift-logo-transparent.png"
              width={384}
              height={384}
              className={`${styles.logo} gateway-official-logo`}
              alt="NowRift official fantasy pixel-art logo"
              priority
              unoptimized
            />
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                {t("main", "A WORLD BETWEEN WORLDS")}
              </p>
              <h1 id="landing-title">
                {t("landing", "Cross the Rift.")}
                <br />
                <em>{t("landing", "Forge Your Legend.")}</em>
              </h1>
              <p className={styles.description}>
                {t(
                  "landing",
                  "Explore forgotten lands, gather powerful equipment, face ancient enemies and grow stronger across every adventure.",
                )}
              </p>
              <button
                id="start-adventure"
                className={styles.play}
                onClick={onPlay}
                disabled={!interactive}
                type="button"
              >
                <span className={styles.playRune} aria-hidden="true" />
                <span>{t("landing", "PLAY NOW")}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M4 12h15m-6-6 6 6-6 6" />
                </svg>
              </button>
              <a
                className={styles.explore}
                href="#worlds-beyond"
                onClick={explore}
              >
                {t("landing", "EXPLORE THE WORLD")}
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
        <a
          className={styles.scrollCue}
          href="#worlds-beyond"
          onClick={explore}
          aria-label={t("landing", "EXPLORE THE WORLD")}
        >
          <span aria-hidden="true" />
          {t("landing", "BEYOND THE BREACH")}
        </a>
      </section>
      <section
        id="worlds-beyond"
        tabIndex={-1}
        className={styles.showcase}
        aria-labelledby="worlds-title"
      >
        <div className={styles.showcaseIntro}>
          <span className={styles.eyebrow}>
            {t("landing", "BEYOND THE BREACH")}
          </span>
          <h2 id="worlds-title">
            {t("landing", "A place to return. A world to discover.")}
          </h2>
        </div>
        <div className={styles.features}>
          {FEATURES.map((feature) => (
            <article
              key={feature.id}
              className={`${styles.feature} ${feature.id === "progression" ? styles.progression : ""}`}
              data-reveal
            >
              <figure>
                <Image
                  src={`/assets/landing/${feature.id}.webp`}
                  alt={t("landing", feature.alt)}
                  width={feature.width}
                  height={feature.height}
                  sizes="(max-width: 700px) 100vw, 50vw"
                  loading="lazy"
                  unoptimized
                />
                <figcaption>{t("landing", feature.note)}</figcaption>
              </figure>
              <div className={styles.featureCopy}>
                <span className={styles.eyebrow}>
                  {t("landing", feature.label)}
                </span>
                <h3>{t("landing", feature.title)}</h3>
                <p>{t("landing", feature.description)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.invitation}>
          <span className={styles.eyebrow}>
            {t("landing", "THE RIFT IS WAITING")}
          </span>
          <h2>{t("landing", "Your next chapter begins here.")}</h2>
          <button
            className={styles.journey}
            onClick={onPlay}
            disabled={!interactive}
            type="button"
          >
            {t("landing", "BEGIN YOUR JOURNEY")}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
      <footer className={styles.footer}>
        <div>
          <span className={styles.footerBrand}>NOWRIFT</span>
          <p>
            {t("landing", "Local saves. No account required.")}
            <br />
            {t(
              "landing",
              "Visited worlds are available offline after caching.",
            )}
          </p>
        </div>
        <div className={styles.footerLinks}>
          <button onClick={onManual} disabled={!interactive} type="button">
            {t("landing", "Field manual")}
          </button>
          <button onClick={onPractice} disabled={!interactive} type="button">
            {t("journey", "Practice & legacy tools")}
          </button>
          <PwaControls />
          <SaveIndicator />
        </div>
      </footer>
    </div>
  );
}
