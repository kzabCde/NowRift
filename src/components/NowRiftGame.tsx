"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import PwaControls from "@/components/PwaControls";
import {
  UPGRADES,
  advanceGame,
  beginGame,
  chooseUpgrade,
  drawGame,
  makeGame,
  resizeGame,
  snapshot,
  togglePause,
  updateGame,
  type Game,
  type Joystick,
  type Snapshot,
  type UpgradeId,
} from "@/game/engine";

const SCORE_KEY = "nowrift-phase1-best-kills";

const initialHud: Snapshot = snapshot(makeGame(960, 540));

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default function NowRiftGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game>(makeGame(960, 540));
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<Joystick>(null);
  const pointerIdRef = useRef<number | null>(null);
  const capturedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordedRef = useRef(false);
  const [hud, setHud] = useState<Snapshot>(initialHud);
  const [bestKills, setBestKills] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [touchEngaged, setTouchEngaged] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("nowrift-immersive", immersive);
    return () => document.body.classList.remove("nowrift-immersive");
  }, [immersive]);

  const syncHud = useCallback(() => setHud(snapshot(gameRef.current)), []);

  const clearPointer = useCallback(() => {
    const id = pointerIdRef.current;
    const element = capturedCanvasRef.current;
    pointerIdRef.current = null;
    joystickRef.current = null;
    capturedCanvasRef.current = null;
    setTouchEngaged(false);
    if (id !== null && element?.hasPointerCapture(id)) {
      element.releasePointerCapture(id);
    }
  }, []);

  const start = useCallback(() => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    const game = makeGame(Math.max(1, bounds?.width ?? 960), Math.max(1, bounds?.height ?? 540));
    beginGame(game);
    gameRef.current = game;
    keysRef.current.clear();
    clearPointer();
    recordedRef.current = false;
    setHud(snapshot(game));
  }, [clearPointer]);

  const pause = useCallback(() => {
    togglePause(gameRef.current);
    if (gameRef.current.phase !== "playing") {
      clearPointer();
      keysRef.current.clear();
    }
    syncHud();
  }, [clearPointer, syncHud]);

  const selectUpgrade = useCallback((id: UpgradeId) => {
    if (chooseUpgrade(gameRef.current, id)) {
      clearPointer();
      keysRef.current.clear();
      syncHud();
    }
  }, [clearPointer, syncHud]);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(SCORE_KEY));
      if (Number.isFinite(stored)) setBestKills(Math.max(0, stored));
    } catch {
      // Local storage is optional; gameplay also works in private browsing.
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    function resize() {
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width < 40 || bounds.height < 40) return;
      const game = gameRef.current;
      const previousWidth = game.width;
      const previousHeight = game.height;
      const width = bounds.width;
      const height = bounds.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      resizeGame(game, width, height);
      if (joystickRef.current && previousWidth > 0 && previousHeight > 0) {
        joystickRef.current.x *= width / previousWidth;
        joystickRef.current.y *= height / previousHeight;
      }
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "escape" && !event.repeat) {
        togglePause(gameRef.current);
        clearPointer();
        keysRef.current.clear();
        syncHud();
        return;
      }
      if (gameRef.current.phase !== "playing") return;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      keysRef.current.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    const onInterruption = () => {
      keysRef.current.clear();
      clearPointer();
      if (gameRef.current.phase === "playing") {
        togglePause(gameRef.current);
        syncHud();
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) onInterruption();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onInterruption);
    document.addEventListener("visibilitychange", onVisibilityChange);

    let frameId = 0;
    let previousTime = performance.now();
    let previousHudTime = 0;
    let previousPhase = gameRef.current.phase;

    const frame = (now: number) => {
      const dt = Math.max(0, (now - previousTime) / 1000);
      previousTime = now;
      const game = gameRef.current;
      const keys = keysRef.current;
      let dx = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
      let dy = Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup"));
      if (joystickRef.current) {
        dx += joystickRef.current.dx;
        dy += joystickRef.current.dy;
      }
      advanceGame(game, dt, dx, dy);
      if (game.phase !== "playing" && pointerIdRef.current !== null) {
        clearPointer();
        keysRef.current.clear();
      }

      if (game.phase === "gameover" && !recordedRef.current) {
        recordedRef.current = true;
        setBestKills((previous) => {
          const best = Math.max(previous, game.kills);
          try { window.localStorage.setItem(SCORE_KEY, String(best)); } catch { /* optional */ }
          return best;
        });
      }

      const dprX = canvas.width / Math.max(1, game.width);
      const dprY = canvas.height / Math.max(1, game.height);
      context.setTransform(dprX, 0, 0, dprY, 0, 0);
      drawGame(context, game, joystickRef.current);

      if (now - previousHudTime > 110 || previousPhase !== game.phase) {
        setHud(snapshot(game));
        previousHudTime = now;
        previousPhase = game.phase;
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onInterruption);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clearPointer, syncHud]);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (gameRef.current.phase !== "playing" || pointerIdRef.current !== null) return;
    const point = getPoint(event);
    pointerIdRef.current = event.pointerId;
    capturedCanvasRef.current = event.currentTarget;
    joystickRef.current = { ...point, dx: 0, dy: 0 };
    setTouchEngaged(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId || !joystickRef.current) return;
    const point = getPoint(event);
    const joy = joystickRef.current;
    const dx = point.x - joy.x;
    const dy = point.y - joy.y;
    const distance = Math.hypot(dx, dy);
    joy.dx = distance > 0 ? dx / Math.max(distance, 42) : 0;
    joy.dy = distance > 0 ? dy / Math.max(distance, 42) : 0;
  };

  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    clearPointer();
  };

  const upgrades = hud.offers
    .map((id) => UPGRADES.find((upgrade) => upgrade.id === id))
    .filter((upgrade): upgrade is (typeof UPGRADES)[number] => Boolean(upgrade));

  return (
    <main className={immersive ? "site-shell immersive" : "site-shell"}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-symbol" aria-hidden="true">N<span>✦</span></div>
          <div className="brand-text">NOW<span>RIFT</span><small>PROJECT / 001</small></div>
        </div>
        <div className="header-right">
          <span className="header-note">BROWSER RPG EXPERIMENT</span>
          <PwaControls />
        </div>
      </header>

      <div className="content">
        <div className="hero">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> PHASE 01 / PLAYABLE PROTOTYPE</div>
            <h1>SURVIVE <em>THE RIFT.</em></h1>
            <p>One arena. Endless threats. Every upgrade changes your run. Move, survive, and let your weapon do the talking.</p>
          </div>
          <div className="hero-meta">
            <span className="meta-kicker">YOUR PERSONAL BEST</span>
            <strong>{String(bestKills).padStart(3, "0")} <small>KILLS</small></strong>
            <span className="meta-foot">Stored on this device only</span>
          </div>
        </div>

        <section className="game-card" aria-label="NowRift playable game">
          <div className="game-topbar">
            <div className="sector-heading"><span className="sector-icon">◈</span> SECTOR 01 <span className="sector-separator">/</span> THE BREACH</div>
            <div className="game-actions">
              <span className="game-state"><span className={hud.phase === "playing" ? "state-dot active" : "state-dot"} /> {hud.phase === "playing" ? "LIVE RUN" : hud.phase === "menu" ? "STANDBY" : hud.phase.toUpperCase()}</span>
              <button className="action-button" onClick={pause} disabled={hud.phase !== "playing" && hud.phase !== "paused"} type="button">
                {hud.phase === "paused" ? "▶ RESUME" : "Ⅱ PAUSE"}
              </button>
              <button
                className="action-button focus-button"
                onClick={() => setImmersive((current) => !current)}
                aria-pressed={immersive}
                aria-label={immersive ? "Exit focus mode" : "Enter focus mode"}
                type="button"
              >{immersive ? "✕ EXIT" : "⛶ FOCUS"}</button>
              <button className="action-button restart-button" onClick={start} type="button">↻ RESTART</button>
            </div>
          </div>

          <div className="hud-row">
            <div className="level-shape">LV <strong>{String(hud.level).padStart(2, "0")}</strong></div>
            <div className="bars">
              <div className="bar-heading"><span><span className="bar-pip health" /> INTEGRITY</span><span>{hud.hp} / {hud.maxHp}</span></div>
              <div className="bar-track"><div className="bar-fill health-fill" style={{ width: String(Math.max(0, (hud.hp / hud.maxHp) * 100)) + "%" }} /></div>
              <div className="bar-heading xp-heading"><span><span className="bar-pip xp" /> EXPERIENCE</span><span>{hud.xp} / {hud.xpToNext}</span></div>
              <div className="bar-track small-track"><div className="bar-fill xp-fill" style={{ width: String(Math.min(100, (hud.xp / hud.xpToNext) * 100)) + "%" }} /></div>
            </div>
            <div className="hud-stats">
              <Stat label="TIME" value={formatClock(hud.time)} />
              <Stat label="WAVE" value={String(hud.wave).padStart(2, "0")} />
              <Stat label="KILLS" value={String(hud.kills).padStart(3, "0")} />
              <Stat label="CREDITS" value={hud.gold} />
            </div>
          </div>

          <div className="arena">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              data-touch-active={touchEngaged}
              aria-label="Game arena. Use WASD or arrow keys to move, or drag on a touch screen. Weapons fire automatically."
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onLostPointerCapture={onPointerEnd}
              onContextMenu={(event) => event.preventDefault()}
            />

            {hud.phase === "menu" && (
              <div className="arena-overlay">
                <div className="overlay-orbit">✦</div>
                <span className="overlay-eyebrow">RIFT CONNECTION ESTABLISHED</span>
                <h2>THE BREACH<br /><span>AWAITS.</span></h2>
                <p>Defeat enemies, gather XP, and choose upgrades to survive escalating waves.</p>
                <button className="primary-button" onClick={start} type="button">ENTER THE RIFT <span>↗</span></button>
                <span className="overlay-hint">NO ACCOUNT · OFFLINE AFTER FIRST LOAD</span>
              </div>
            )}

            {hud.phase === "paused" && (
              <div className="arena-overlay compact">
                <span className="overlay-eyebrow">SYSTEM SUSPENDED</span>
                <h2>PAUSED<span>.</span></h2>
                <p>Your run is safe for now.</p>
                <button className="primary-button" onClick={pause} type="button">RESUME RUN <span>▶</span></button>
              </div>
            )}

            {hud.phase === "gameover" && (
              <div className="arena-overlay compact">
                <span className="overlay-eyebrow defeat">SIGNAL LOST / RUN COMPLETE</span>
                <h2>RIFT <span>FALLEN.</span></h2>
                <div className="result-row"><span>{hud.kills} KILLS</span><span>{formatClock(hud.time)} SURVIVED</span><span>LVL {hud.level}</span></div>
                <button className="primary-button" onClick={start} type="button">TRY AGAIN <span>↻</span></button>
              </div>
            )}

            {hud.phase === "upgrade" && (
              <div className="arena-overlay upgrade-overlay">
                <span className="overlay-eyebrow">LEVEL {String(hud.level).padStart(2, "0")} REACHED</span>
                <h2>CHOOSE YOUR <span>POWER.</span></h2>
                <p>Select one enhancement to continue your run.</p>
                <div className="upgrade-grid">
                  {upgrades.map((upgrade) => (
                    <button className="upgrade-card" key={upgrade.id} onClick={() => selectUpgrade(upgrade.id)} type="button">
                      <span className="upgrade-symbol" style={{ color: upgrade.accent }}>{upgrade.symbol}</span>
                      <strong>{upgrade.name}</strong>
                      <small>{upgrade.description}</small>
                      <span className="upgrade-select">SELECT ↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hud.phase === "playing" && (
              <>
                <div className="in-game-hint">AUTO FIRE <span>●</span> ENABLED</div>
                <div className="touch-hint" aria-hidden="true">{touchEngaged ? "◆ MOVING" : "◎ DRAG TO MOVE"}</div>
              </>
            )}
          </div>

          <div className="arena-footer">
            <div className="control-hint"><span className="keycaps"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>MOVE</span><span className="control-divider">/</span><span>ARROW KEYS OR TOUCH DRAG</span></div>
            <div className="footer-info">AUTO ATTACK <span>◆</span> PICK UP XP <span>◆</span> SURVIVE</div>
          </div>
        </section>

        <section className="below-game" aria-label="Prototype features">
          <div className="build-status">
            <span className="eyebrow">WHAT'S INSIDE</span>
            <h3>A small start.<br /><span>A bigger world ahead.</span></h3>
            <p>Phase 01 is designed to validate the core combat loop before accounts, multiplayer, trading, and persistent progression are added.</p>
          </div>
          <div className="feature-list">
            <div className="feature"><span className="feature-number">01</span><div><strong>Auto-combat arena</strong><small>Move freely, kite enemies, survive wave after wave.</small></div><span className="feature-check">✓</span></div>
            <div className="feature"><span className="feature-number">02</span><div><strong>Level-up choices</strong><small>Collect experience and shape your build mid-run.</small></div><span className="feature-check">✓</span></div>
            <div className="feature"><span className="feature-number">03</span><div><strong>Device-local record</strong><small>Personal best saved in browser storage only.</small></div><span className="feature-check">✓</span></div>
            <div className="feature future"><span className="feature-number">04</span><div><strong>Online worlds & economy</strong><small>Accounts, inventory, trading and PvP come later.</small></div><span className="future-label">LATER</span></div>
          </div>
        </section>
      </div>
      <footer className="site-footer"><span>© NOWRIFT / PHASE 01</span><span>CRAFTED FOR THE BROWSER · NO DATABASE</span><span>LOCAL DEMO BUILD</span></footer>
    </main>
  );
}
