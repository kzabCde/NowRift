"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Brand, Modal } from "./GameUi";
import { campaignRepository } from "@/game/campaign/persistence";
import type { Progress } from "@/game/campaign/progression";
import {
  ITEMS,
  RARITIES,
  SHOP,
  RECIPES,
  UPGRADES,
  statNames,
} from "@/game/rpg/content";
import { inventory, usedSlots } from "@/game/rpg/inventory";
import {
  calculateStats,
  characterLevel,
  itemStats,
  equipmentPower,
} from "@/game/rpg/stats";
import { enhancementQuote } from "@/game/rpg/enhancement";
import {
  sellPrice,
  dismantleYield,
  shopEquipment,
  type ActionBody,
} from "@/game/rpg/actions";
import { enhancementSound } from "@/game/rpg/sound";
import {
  SLOTS,
  RARITY_IDS,
  type EquipmentInstance,
  type InventoryEntry,
  type StatKey,
} from "@/game/rpg/model";
import type { WeaponId } from "@/game/content/forest";

type Tab = "inventory" | "character" | "blacksmith" | "shop" | "history";
type Confirm = {
  title: string;
  action: ActionBody;
  revision: number;
  content: ReactNode;
};
export function ItemIcon({ id, size = 40 }: { id: string; size?: number }) {
  const icon = ITEMS[id]?.icon ?? 42;
  return (
    <span
      aria-hidden="true"
      className="rpg-icon"
      style={{
        width: size,
        height: size,
        backgroundSize: `${size * 8}px ${size * 6}px`,
        backgroundPosition: `-${(icon % 8) * size}px -${Math.floor(icon / 8) * size}px`,
      }}
    />
  );
}
export function formatStat(key: StatKey, value: number) {
  return ["attackSpeed", "critChance", "critDamage", "area"].includes(key)
    ? `${(value * 100).toFixed(1)}%`
    : value.toFixed(["regen", "damage"].includes(key) ? 1 : 0);
}
function StatsComparison({
  profile,
  candidate,
  weapon,
}: {
  profile: Progress;
  candidate: EquipmentInstance;
  weapon: WeaponId;
}) {
  const current = calculateStats(profile, weapon),
    preview = structuredClone(profile),
    slot = ITEMS[candidate.definitionId].slot!;
  preview.rpg!.equipment = preview
    .rpg!.equipment.filter((e) => e.id !== candidate.id)
    .concat(candidate);
  preview.rpg!.equipped[slot] = candidate.id;
  const next = calculateStats(preview, weapon);
  return (
    <div className="rpg-comparison">
      <span className="rpg-caption">CAMPAIGN BUILD COMPARISON</span>
      {(Object.keys(statNames) as StatKey[]).map((key) => {
        const delta = next[key] - current[key];
        return (
          <div key={key}>
            <span>{statNames[key]}</span>
            <b>{formatStat(key, current[key])}</b>
            <strong
              className={delta > 0 ? "positive" : delta < 0 ? "negative" : ""}
            >
              {delta === 0
                ? "—"
                : `${delta > 0 ? "+" : ""}${formatStat(key, delta)}`}
            </strong>
          </div>
        );
      })}
      <div>
        <span>Attack interval</span>
        <b>{current.interval.toFixed(2)}s</b>
        <strong>{next.interval.toFixed(2)}s</strong>
      </div>
      <div>
        <span>Power</span>
        <b>{current.power}</b>
        <strong className={next.power > current.power ? "positive" : ""}>
          {next.power}
        </strong>
      </div>
    </div>
  );
}
function itemDescription(e: InventoryEntry) {
  const d = ITEMS[e.definitionId];
  return `${d.name}${e.equipment ? ` · ${RARITIES[e.equipment.rarity].name} · Item Lv ${e.equipment.level} · +${e.equipment.enhancement}` : ` ×${e.quantity}`}\n${d.description}`;
}
export default function RpgScreen({
  onBack,
  weapon = "arcane",
}: {
  onBack: () => void;
  weapon?: WeaponId;
}) {
  const [profile, setProfile] = useState<Progress | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState<Tab>("inventory"),
    [selection, setSelection] = useState("starter-weapon"),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("rarity"),
    [amount, setAmount] = useState(1),
    [confirm, setConfirm] = useState<Confirm | null>(null),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(true),
    [flash, setFlash] = useState("");
  const details = useRef<HTMLElement | null>(null),
    bagPanel = useRef<HTMLElement | null>(null);
  function inspect(id: string) {
    setSelection(id);
    setFlash("");
    if (matchMedia("(max-width:760px)").matches)
      requestAnimationFrame(() =>
        details.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  }
  const guard = useRef(false),
    audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    let cancelled = false;
    campaignRepository
      .load()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    try {
      setSound(localStorage.getItem("nowrift-rpg-sfx") !== "off");
    } catch {
      /* Optional preference. */
    }
    return () => {
      cancelled = true;
      void audio.current?.close();
    };
  }, []);
  const closeConfirm = useCallback(() => {
    if (!guard.current) setConfirm(null);
  }, []);
  const run = useCallback(
    async (action: ActionBody, revision?: number) => {
      if (guard.current || !profile) return;
      guard.current = true;
      setBusy(true);
      setError("");
      setConfirm(null);
      if (action.type === "enhance" && sound) {
        try {
          audio.current ??= new AudioContext();
          void audio.current.resume();
        } catch {
          /* Audio is optional; transaction behavior is unchanged. */
        }
      }
      try {
        const result = await campaignRepository.act({
          id: "action-" + crypto.randomUUID(),
          at: Date.now(),
          expectedRevision: revision ?? profile.rpg!.revision,
          action,
        });
        setProfile(result.progress);
        setNotice(result.entry?.message ?? "Action already applied.");
        if (result.entry?.enhancement) {
          const success = result.entry.enhancement.success;
          setFlash(success ? "success" : "failure");
          if (sound && audio.current) enhancementSound(audio.current, success);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action could not be saved.");
        try {
          setProfile(await campaignRepository.load());
        } catch {
          /* Preserve current view if storage remains unavailable. */
        }
      } finally {
        guard.current = false;
        setBusy(false);
      }
    },
    [profile, sound],
  );
  const all = useMemo(() => (profile ? inventory(profile) : []), [profile]);
  const chosen = all.find((e) => e.id === selection),
    item = chosen?.equipment;
  const bag = useMemo(() => {
    const source =
      tab === "blacksmith"
        ? all.filter((e) => e.equipment)
        : all.filter((e) => !e.equipped);
    const filtered = source.filter(
      (e) =>
        filter === "all" ||
        (filter === "favorites" && e.favorite) ||
        (filter === "equipment" && !!e.equipment) ||
        ITEMS[e.definitionId].kind === filter ||
        ITEMS[e.definitionId].slot === filter,
    );
    return filtered.sort((a, b) =>
      sort === "name"
        ? ITEMS[a.definitionId].name.localeCompare(ITEMS[b.definitionId].name)
        : sort === "type"
          ? ITEMS[a.definitionId].kind.localeCompare(
              ITEMS[b.definitionId].kind,
            ) ||
            String(ITEMS[a.definitionId].slot).localeCompare(
              String(ITEMS[b.definitionId].slot),
            )
          : sort === "power"
            ? (b.equipment ? equipmentPower(b.equipment) : 0) -
              (a.equipment ? equipmentPower(a.equipment) : 0)
            : RARITY_IDS.indexOf(b.equipment?.rarity ?? "common") -
                RARITY_IDS.indexOf(a.equipment?.rarity ?? "common") ||
              ITEMS[a.definitionId].name.localeCompare(
                ITEMS[b.definitionId].name,
              ),
    );
  }, [all, filter, sort, tab]);
  function ask(title: string, action: ActionBody, content: ReactNode) {
    if (profile && !guard.current)
      setConfirm({ title, action, revision: profile.rpg!.revision, content });
  }
  function protectReason(entry: InventoryEntry) {
    return entry.equipped
      ? "Unequip before selling or dismantling."
      : entry.locked
        ? "Unlock this item first."
        : entry.favorite
          ? "Unfavorite this protected item first."
          : "";
  }
  function tile(e: InventoryEntry) {
    return (
      <button
        key={e.id}
        type="button"
        className={`rpg-cell ${selection === e.id ? "selected" : ""}`}
        style={
          {
            "--item-color": RARITIES[e.equipment?.rarity ?? "common"].color,
          } as React.CSSProperties
        }
        onClick={() => {
          inspect(e.id);
        }}
        aria-label={itemDescription(e)}
        title={itemDescription(e)}
        aria-pressed={selection === e.id}
      >
        <ItemIcon id={e.definitionId} size={40} />
        {e.quantity > 1 && <span className="rpg-quantity">{e.quantity}</span>}
        {e.equipment && e.equipment.enhancement > 0 && (
          <span className="rpg-enhance-tag">+{e.equipment.enhancement}</span>
        )}
        {(e.favorite || e.locked) && (
          <span className="rpg-protect-tag">{e.locked ? "L" : "F"}</span>
        )}
        {e.equipped && <span className="rpg-equipped-tag">E</span>}
      </button>
    );
  }
  if (!profile)
    return (
      <main className="rpg-page">
        <header className="topbar">
          <Brand />
          <button className="quiet-button" onClick={onBack}>
            ← HUB
          </button>
        </header>
        <div className="rpg-loading">
          <h1>Your satchel awaits.</h1>
          <p role={error ? "alert" : "status"}>
            {error || "Reading your local inventory…"}
          </p>
          <p className="muted">
            Existing campaign saves are preserved. No online account is
            required.
          </p>
        </div>
      </main>
    );
  const r = profile.rpg!,
    stats = calculateStats(profile, weapon),
    level = characterLevel(profile.xp),
    locked = chosen ? protectReason(chosen) : "";
  const quote = item && item.enhancement < 15 ? enhancementQuote(item) : null;
  const costAvailable = quote
    ? profile.gold >= quote.gold &&
      Object.entries(quote.materials).every(
        ([id, n]) => (profile.materials[id] ?? 0) >= n,
      )
    : false;
  return (
    <main className="rpg-page">
      <header className="topbar">
        <Brand />
        <div className="header-right">
          <button
            className="quiet-button"
            aria-pressed={sound}
            onClick={() => {
              const next = !sound;
              setSound(next);
              try {
                localStorage.setItem("nowrift-rpg-sfx", next ? "on" : "off");
              } catch {
                /* optional */
              }
            }}
          >
            {sound ? "SFX ON" : "SFX OFF"}
          </button>
          <button className="quiet-button" disabled={busy} onClick={onBack}>
            ← RETURN TO HUB
          </button>
        </div>
      </header>
      <div className="rpg-shell">
        <div className="rpg-heading">
          <div>
            <span className="eyebrow">THE WANDERER’S SANCTUARY</span>
            <h1>
              Every relic <em>tells a story.</em>
            </h1>
          </div>
          <div className="rpg-wallet">
            <span>YOUR COIN PURSE</span>
            <strong data-testid="rpg-gold">
              {profile.gold.toLocaleString()} <small>GOLD</small>
            </strong>
            <small>
              LEVEL {level.level} · POWER {stats.power}
            </small>
          </div>
        </div>
        <nav className="rpg-tabs" aria-label="RPG systems">
          {(
            ["inventory", "character", "blacksmith", "shop", "history"] as Tab[]
          ).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={tab === t ? "selected" : ""}
              onClick={() => {
                setTab(t);
                setFlash("");
                setFilter("all");
              }}
            >
              {t === "shop"
                ? "THE TRADER"
                : t === "history"
                  ? "JOURNAL"
                  : t.toUpperCase()}
            </button>
          ))}
        </nav>
        <div className="rpg-notices" aria-live="polite">
          {error && (
            <p className="notice negative" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className={`rpg-notice ${flash}`} role="status">
              {notice}
            </p>
          )}
          {busy && <p className="muted">Saving transaction…</p>}
        </div>
        {r.overflow.length > 0 && (
          <section className="rpg-overflow">
            <div>
              <span className="eyebrow">
                UNCLAIMED LOOT / {r.overflow.length} PARCELS
              </span>
              <p>
                Your bag was full. These rewards remain safe until you make
                room.
              </p>
            </div>
            <div>
              {r.overflow.map((o) => (
                <button
                  key={o.id}
                  disabled={busy}
                  onClick={() => void run({ type: "claim", parcelId: o.id })}
                >
                  <ItemIcon
                    id={o.equipment?.definitionId ?? o.definitionId!}
                    size={28}
                  />
                  <span>
                    {ITEMS[o.equipment?.definitionId ?? o.definitionId!].name}
                    {o.quantity ? ` ×${o.quantity}` : ""}
                  </span>
                  CLAIM
                </button>
              ))}
            </div>
          </section>
        )}
        {tab === "history" ? (
          <section className="rpg-panel rpg-journal">
            <span className="eyebrow">EVERY COIN ACCOUNTED FOR</span>
            <h2>Transaction journal</h2>
            <p className="muted">
              Latest 100 entries shown. Every mutation is recorded locally;
              client-side saves are not tamper-proof.
            </p>
            {r.history.length ? (
              r.history
                .slice(-100)
                .reverse()
                .map((e) => (
                  <article key={e.id}>
                    <span className="rpg-caption">
                      {e.kind.toUpperCase()} ·{" "}
                      {e.at ? new Date(e.at).toLocaleString() : "LEGACY IMPORT"}
                    </span>
                    <strong>{e.message}</strong>
                    <b className={e.gold >= 0 ? "positive" : "negative"}>
                      {e.gold >= 0 ? "+" : ""}
                      {e.gold} GOLD
                    </b>
                    <p>{e.items.join(" · ")}</p>
                    {e.enhancement && (
                      <p>
                        Chance {(e.enhancement.effective * 100).toFixed(0)}% ·
                        Pity {e.enhancement.pityBefore} →{" "}
                        {e.enhancement.pityAfter} · +{e.enhancement.before} → +
                        {e.enhancement.after}
                      </p>
                    )}
                  </article>
                ))
            ) : (
              <p>Your journey has yet to leave a mark.</p>
            )}
          </section>
        ) : tab === "shop" ? (
          <section className="rpg-shop">
            <div className="rpg-panel">
              <span className="eyebrow">MERRICK / THE ROADWARD TRADER</span>
              <h2>Supplies for the road.</h2>
              <p className="muted">
                Fixed wares and honest prices. Selling returns a fraction of
                purchase value.
              </p>
              <label className="rpg-amount">
                Purchase quantity
                <input
                  aria-label="Purchase quantity"
                  type="number"
                  min={1}
                  max={99}
                  value={Number.isNaN(amount) ? "" : amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <div className="rpg-offers">
                {SHOP.map((offer) => {
                  const def = ITEMS[offer.item],
                    preview = offer.rarity
                      ? shopEquipment(offer.id, "preview")
                      : null;
                  return (
                    <article
                      key={offer.id}
                      style={
                        {
                          "--item-color":
                            RARITIES[offer.rarity ?? "common"].color,
                        } as React.CSSProperties
                      }
                    >
                      <ItemIcon id={offer.item} size={56} />
                      <div>
                        <span className="rpg-caption">
                          {offer.rarity
                            ? `${offer.rarity.toUpperCase()} · ITEM LV ${offer.level}`
                            : def.kind.toUpperCase()}
                        </span>
                        <h3>{def.name}</h3>
                        <p>{def.description}</p>
                        {preview && (
                          <p className="rpg-offer-stats">
                            {Object.entries(itemStats(preview))
                              .filter(([, v]) => v > 0)
                              .map(
                                ([key, v]) =>
                                  `${statNames[key as StatKey]} +${formatStat(key as StatKey, v)}`,
                              )
                              .join(" · ")}
                          </p>
                        )}
                        <strong>{offer.price * amount} GOLD</strong>
                        <button
                          className="rpg-button"
                          disabled={
                            busy ||
                            !Number.isInteger(amount) ||
                            amount < 1 ||
                            amount > 99 ||
                            profile.gold < offer.price * amount
                          }
                          onClick={() =>
                            ask(
                              "Confirm purchase",
                              {
                                type: "buy",
                                offerId: offer.id,
                                quantity: amount,
                              },
                              <p>
                                Buy {amount} × {def.name} for{" "}
                                <strong>{offer.price * amount} gold</strong>?
                                Available: {profile.gold} gold. Equipment rolls
                                match the displayed fixed shop attributes.
                              </p>,
                            )
                          }
                        >
                          BUY {def.name.toUpperCase()}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <h2>Material crafting</h2>
              <div className="rpg-recipes">
                {RECIPES.map((recipe) => (
                  <article key={recipe.id}>
                    <ItemIcon id={recipe.output} />
                    <div>
                      <h3>{recipe.name}</h3>
                      <p>
                        {recipe.gold} gold ·{" "}
                        {Object.entries(recipe.materials)
                          .map(
                            ([id, n]) =>
                              `${ITEMS[id].name} ${n}/${profile.materials[id] ?? 0}`,
                          )
                          .join(" · ")}
                      </p>
                      <button
                        className="rpg-button"
                        disabled={
                          busy ||
                          profile.gold < recipe.gold ||
                          Object.entries(recipe.materials).some(
                            ([id, n]) => (profile.materials[id] ?? 0) < n,
                          )
                        }
                        onClick={() =>
                          ask(
                            "Confirm crafting",
                            { type: "craft", recipeId: recipe.id, quantity: 1 },
                            <p>
                              Consume {recipe.gold} gold and{" "}
                              {Object.entries(recipe.materials)
                                .map(([id, n]) => `${n} ${ITEMS[id].name}`)
                                .join(", ")}{" "}
                              to create {ITEMS[recipe.output].name}?
                            </p>,
                          )
                        }
                      >
                        CRAFT
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <aside className="rpg-panel">
              <span className="eyebrow">SELL FROM YOUR SATCHEL</span>
              <h2>Trade unwanted finds.</h2>
              <p className="muted">
                Select any owned item in Inventory to sell it. Equipped, locked
                and favorite items are protected.
              </p>
              <button
                className="rpg-button"
                onClick={() => setTab("inventory")}
              >
                OPEN INVENTORY
              </button>
              <div className="rpg-materials">
                {Object.entries(profile.materials)
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <div key={id}>
                      <ItemIcon id={id} size={28} />
                      <span>{ITEMS[id].name}</span>
                      <b>{n}</b>
                    </div>
                  ))}
              </div>
            </aside>
          </section>
        ) : (
          <div className="rpg-workspace">
            <aside className="rpg-panel rpg-character">
              <div className="rpg-panel-title">
                <span>RIFT WANDERER</span>
                <small>LV {level.level}</small>
              </div>
              <div className="rpg-paperdoll">
                <div
                  className="rpg-avatar"
                  style={{
                    boxShadow: `0 0 65px ${RARITIES[all.find((e) => e.id === r.equipped.weapon)?.equipment?.rarity ?? "common"].color}22`,
                  }}
                />
                <div className="rpg-slots">
                  {SLOTS.map((slot) => {
                    const e = all.find((e) => e.id === r.equipped[slot]);
                    return (
                      <button
                        key={slot}
                        className={`rpg-slot ${e && selection === e.id ? "selected" : ""}`}
                        aria-label={`${slot} equipment slot${e ? ": " + ITEMS[e.definitionId].name : ": empty"}`}
                        onClick={() => {
                          if (e) inspect(e.id);
                        }}
                        disabled={!e}
                        style={
                          {
                            "--item-color":
                              RARITIES[e?.equipment?.rarity ?? "common"].color,
                          } as React.CSSProperties
                        }
                      >
                        <span>{slot.toUpperCase()}</span>
                        {e ? (
                          <ItemIcon id={e.definitionId} size={44} />
                        ) : (
                          <span className="empty-slot">—</span>
                        )}
                        {e?.equipment && (
                          <small>+{e.equipment.enhancement}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rpg-power">
                <span>CAMPAIGN POWER</span>
                <strong>{stats.power}</strong>
              </div>
              <div className="rpg-level">
                <span>CHARACTER LEVEL {level.level}</span>
                <b>
                  {level.xp} / {level.next || "MAX"} XP
                </b>
                <div>
                  <i
                    style={{
                      width: `${level.next ? Math.min(100, (level.xp / level.next) * 100) : 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="muted">
                Permanent progression is separate from temporary run levels.
                Gear applies to your chosen Hub attack style.
              </p>
              <dl className="rpg-stat-list">
                {(Object.keys(statNames) as StatKey[]).map((key) => (
                  <div key={key}>
                    <dt>{statNames[key]}</dt>
                    <dd>{formatStat(key, stats[key])}</dd>
                  </div>
                ))}
                <div>
                  <dt>Attack interval</dt>
                  <dd>{stats.interval.toFixed(2)}s</dd>
                </div>
              </dl>
            </aside>
            <section ref={bagPanel} className="rpg-panel rpg-bag">
              {tab === "character" ? (
                <>
                  <span className="eyebrow">A LASTING STRENGTH</span>
                  <h2>Permanent disciplines</h2>
                  <p className="muted">
                    Small lasting bonuses complement each run’s blessings. Ranks
                    are capped at ten.
                  </p>
                  {Object.entries(UPGRADES).map(([id, u]) => {
                    const rank = r.upgrades[id] ?? 0,
                      cost = 100 * (rank + 1) ** 2;
                    return (
                      <article className="rpg-discipline" key={id}>
                        <ItemIcon
                          id={
                            id === "vigor"
                              ? "forest-armor"
                              : id === "stride"
                                ? "forest-boots"
                                : id === "ward"
                                  ? "forest-helmet"
                                  : "forest-weapon"
                          }
                          size={44}
                        />
                        <div>
                          <h3>
                            {u.name} <small>{rank}/10</small>
                          </h3>
                          <p>{u.description}</p>
                          <button
                            className="rpg-button"
                            disabled={
                              busy ||
                              rank >= 10 ||
                              profile.gold < cost ||
                              (profile.materials["copper-ore"] ?? 0) < rank + 1
                            }
                            onClick={() =>
                              ask(
                                "Learn permanent discipline",
                                {
                                  type: "upgrade",
                                  upgradeId: id as keyof typeof UPGRADES,
                                },
                                <p>
                                  Spend {cost} gold and {rank + 1} Copper Ore
                                  for rank {rank + 1} of {u.name}?
                                </p>,
                              )
                            }
                          >
                            {rank === 10
                              ? "MASTERED"
                              : `${cost} GOLD · ${rank + 1} ORE → LEARN`}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </>
              ) : (
                <>
                  <div className="rpg-panel-title">
                    <span>
                      {tab === "blacksmith"
                        ? "SELECT EQUIPMENT"
                        : "YOUR INVENTORY"}
                    </span>
                    <small data-testid="bag-capacity">
                      {usedSlots(profile)} / {r.capacity}
                    </small>
                  </div>
                  <div className="rpg-bag-tools">
                    <label>
                      Filter
                      <select
                        aria-label="Inventory category"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {[
                          "all",
                          "equipment",
                          "weapon",
                          "armor",
                          "helmet",
                          "boots",
                          "ring",
                          "necklace",
                          "material",
                          "consumable",
                          "favorites",
                        ].map((x) => (
                          <option key={x} value={x}>
                            {x.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sort
                      <select
                        aria-label="Inventory sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="rarity">RARITY</option>
                        <option value="type">TYPE</option>
                        <option value="power">POWER</option>
                        <option value="name">NAME</option>
                      </select>
                    </label>
                  </div>
                  <div className="rpg-grid" aria-label="Inventory slots">
                    {bag.map(tile)}
                    {Array.from(
                      {
                        length: Math.max(
                          0,
                          (tab === "blacksmith" ? 6 : 60) - bag.length,
                        ),
                      },
                      (_, i) => (
                        <div
                          className="rpg-cell empty"
                          aria-hidden="true"
                          key={"empty-" + i}
                        />
                      ),
                    )}
                  </div>
                  <p className="muted">
                    Equipped items occupy the six character slots. Stackable
                    resources use one bag slot per type. Excess earned loot
                    remains in protected parcels.
                  </p>
                  {tab === "blacksmith" && (
                    <div className="rpg-forge-note">
                      <span className="eyebrow">BRAN / THE RIFT FORGE</span>
                      <h2>Temper your legacy.</h2>
                      <p>
                        Choose owned gear, inspect its odds and resources, then
                        confirm a single attempt. No equipment is destroyed by
                        enhancement.
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
            <aside ref={details} className="rpg-panel rpg-details">
              <button
                className="rpg-button rpg-inspect-back"
                onClick={() =>
                  bagPanel.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                ↑ BACK TO INVENTORY
              </button>
              {chosen ? (
                <>
                  <div
                    className="rpg-item-hero"
                    style={
                      {
                        "--item-color":
                          RARITIES[item?.rarity ?? "common"].color,
                      } as React.CSSProperties
                    }
                  >
                    <ItemIcon id={chosen.definitionId} size={80} />
                    <span>
                      {item
                        ? RARITIES[item.rarity].name.toUpperCase()
                        : ITEMS[chosen.definitionId].kind.toUpperCase()}
                    </span>
                    <h2>
                      {ITEMS[chosen.definitionId].name}
                      {item && item.enhancement > 0
                        ? ` +${item.enhancement}`
                        : ""}
                    </h2>
                    <small>
                      {item
                        ? `ITEM LEVEL ${item.level} · ${chosen.equipped ? "EQUIPPED" : "IN BAG"}`
                        : `QUANTITY ${chosen.quantity}`}
                    </small>
                  </div>
                  <p className="rpg-item-description">
                    {ITEMS[chosen.definitionId].description}
                  </p>
                  <div className="rpg-protection">
                    <button
                      className="rpg-button"
                      aria-pressed={chosen.favorite}
                      disabled={busy}
                      onClick={() =>
                        void run({
                          type: "flag",
                          itemId: chosen.id,
                          flag: "favorite",
                        })
                      }
                    >
                      {chosen.favorite ? "UNFAVORITE" : "FAVORITE"}
                    </button>
                    <button
                      className="rpg-button"
                      aria-pressed={chosen.locked}
                      disabled={busy}
                      onClick={() =>
                        void run({
                          type: "flag",
                          itemId: chosen.id,
                          flag: "locked",
                        })
                      }
                    >
                      {chosen.locked ? "UNLOCK ITEM" : "LOCK ITEM"}
                    </button>
                  </div>
                  {item && (
                    <>
                      <div className="rpg-item-stats">
                        {Object.entries(itemStats(item))
                          .filter(([, v]) => v > 0)
                          .map(([key, v]) => (
                            <div key={key}>
                              <span>{statNames[key as StatKey]}</span>
                              <strong>+{formatStat(key as StatKey, v)}</strong>
                            </div>
                          ))}
                      </div>
                      <button
                        className="rpg-primary"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            chosen.equipped
                              ? {
                                  type: "unequip",
                                  slot: ITEMS[chosen.definitionId].slot!,
                                }
                              : { type: "equip", itemId: chosen.id },
                          )
                        }
                      >
                        {chosen.equipped ? "UNEQUIP" : "EQUIP ITEM"}
                      </button>
                      <StatsComparison
                        profile={profile}
                        candidate={item}
                        weapon={weapon}
                      />
                    </>
                  )}
                  {item && tab === "blacksmith" ? (
                    <section className="rpg-enhancement-panel">
                      <h3>
                        Enhancement +{item.enhancement} →{" "}
                        {Math.min(15, item.enhancement + 1)}
                      </h3>
                      {quote ? (
                        <>
                          <div className="rpg-chance">
                            <span>BASE {(quote.base * 100).toFixed(0)}%</span>
                            <span>PITY +{(quote.bonus * 100).toFixed(0)}%</span>
                            <strong>
                              {(quote.effective * 100).toFixed(0)}%
                              <small>SUCCESS CHANCE</small>
                            </strong>
                          </div>
                          <p>{quote.failure}</p>
                          <div className="rpg-costs">
                            <div
                              className={
                                profile.gold < quote.gold ? "negative" : ""
                              }
                            >
                              Gold{" "}
                              <b>
                                {quote.gold} / {profile.gold}
                              </b>
                            </div>
                            {Object.entries(quote.materials).map(([id, n]) => (
                              <div
                                key={id}
                                className={
                                  (profile.materials[id] ?? 0) < n
                                    ? "negative"
                                    : ""
                                }
                              >
                                {ITEMS[id].name}
                                <b>
                                  {n} / {profile.materials[id] ?? 0}
                                </b>
                              </div>
                            ))}
                          </div>
                          <div className="rpg-prediction">
                            <span className="rpg-caption">ON SUCCESS</span>
                            {Object.entries(
                              itemStats(item, item.enhancement + 1),
                            )
                              .filter(([, v]) => v > 0)
                              .map(([key, v]) => (
                                <div key={key}>
                                  {statNames[key as StatKey]}
                                  <strong>
                                    {formatStat(
                                      key as StatKey,
                                      itemStats(item)[key as StatKey],
                                    )}{" "}
                                    → {formatStat(key as StatKey, v)}
                                  </strong>
                                </div>
                              ))}
                          </div>
                          <button
                            className="rpg-primary"
                            disabled={busy || item.locked || !costAvailable}
                            onClick={() =>
                              ask(
                                "Confirm enhancement",
                                {
                                  type: "enhance",
                                  itemId: item.id,
                                  expectedEnhancement: item.enhancement,
                                },
                                <>
                                  <p>
                                    {ITEMS[item.definitionId].name}{" "}
                                    <strong>
                                      +{item.enhancement} → +
                                      {item.enhancement + 1}
                                    </strong>
                                  </p>
                                  <p>
                                    Base {(quote.base * 100).toFixed(0)}% · Pity
                                    +{(quote.bonus * 100).toFixed(0)}% ·
                                    Effective{" "}
                                    <strong>
                                      {(quote.effective * 100).toFixed(0)}%
                                    </strong>
                                  </p>
                                  <p>
                                    {quote.gold} gold (owned {profile.gold})
                                    <br />
                                    {Object.entries(quote.materials)
                                      .map(
                                        ([id, n]) =>
                                          `${ITEMS[id].name}: ${n} (owned ${profile.materials[id] ?? 0})`,
                                      )
                                      .join(" · ")}
                                  </p>
                                  <p>{quote.failure}</p>
                                  <p>{quote.pityDescription}</p>
                                </>,
                              )
                            }
                          >
                            ENHANCE EQUIPMENT
                          </button>
                          {item.locked && (
                            <p className="muted">
                              Unlock this item before enhancing.
                            </p>
                          )}
                          {!costAvailable && (
                            <p className="muted">
                              Earn or purchase the missing resources first.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="positive">
                          Maximum enhancement +15 reached.
                        </p>
                      )}
                      <h3>Item enhancement history</h3>
                      <div className="rpg-enhancement-history">
                        {r.history
                          .filter((e) => e.itemId === item.id && e.enhancement)
                          .slice()
                          .reverse()
                          .map((e) => (
                            <p key={e.id}>
                              {e.message} Chance{" "}
                              {(e.enhancement!.effective * 100).toFixed(0)}% ·
                              Pity {e.enhancement!.pityAfter}
                            </p>
                          ))}
                        {!r.history.some(
                          (e) => e.itemId === item.id && e.enhancement,
                        ) && <p>No attempts yet.</p>}
                      </div>
                    </section>
                  ) : (
                    item && (
                      <button
                        className="rpg-button"
                        onClick={() => setTab("blacksmith")}
                      >
                        VISIT THE BLACKSMITH →
                      </button>
                    )
                  )}
                  <div className="rpg-disposal">
                    <h3>Trade & salvage</h3>
                    {locked && <p className="muted">{locked}</p>}
                    {!item && (
                      <label className="rpg-amount">
                        Sell quantity
                        <input
                          aria-label="Sell quantity"
                          type="number"
                          min={1}
                          max={chosen.quantity}
                          value={Number.isNaN(amount) ? "" : amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                        />
                      </label>
                    )}
                    <button
                      className="rpg-button"
                      disabled={
                        busy ||
                        !!locked ||
                        (!item &&
                          (!Number.isInteger(amount) ||
                            amount < 1 ||
                            amount > chosen.quantity))
                      }
                      onClick={() => {
                        const n = item ? 1 : amount;
                        ask(
                          "Confirm sale",
                          { type: "sell", itemId: chosen.id, quantity: n },
                          <p>
                            Sell {n} × {ITEMS[chosen.definitionId].name} for{" "}
                            {sellPrice(chosen) * n} gold? This item will leave
                            your inventory.
                          </p>,
                        );
                      }}
                    >
                      SELL FOR {sellPrice(chosen) * (item ? 1 : amount)} GOLD
                    </button>
                    {item && (
                      <button
                        className="rpg-button danger"
                        disabled={busy || !!locked}
                        onClick={() =>
                          ask(
                            "Confirm dismantle",
                            { type: "dismantle", itemId: item.id, quantity: 1 },
                            <p>
                              Dismantle {ITEMS[item.definitionId].name}{" "}
                              permanently? Receive{" "}
                              {Object.entries(dismantleYield(chosen))
                                .filter(([, n]) => n > 0)
                                .map(([id, n]) => `${ITEMS[id].name} ×${n}`)
                                .join(" · ")}
                              . This cannot be undone.
                            </p>,
                          )
                        }
                      >
                        DISMANTLE EQUIPMENT
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="rpg-empty-detail">
                  <ItemIcon id="forest-ring" size={64} />
                  <h2>A story untold.</h2>
                  <p>
                    Select an item to inspect its attributes, compare equipment,
                    or visit the forge.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
        <footer className="rpg-footnote">
          LOCAL SINGLE-PLAYER ECONOMY · NO CLOUD SAVE · CAMPAIGN GEAR APPLIES
          WHEN A NEW RUN BEGINS
        </footer>
      </div>
      {confirm && (
        <Modal title={confirm.title} onClose={closeConfirm}>
          <span className="eyebrow">REVIEW BEFORE YOU COMMIT</span>
          <h2>{confirm.title}</h2>
          <div className="rpg-confirm-copy">{confirm.content}</div>
          <div className="dialog-actions">
            <button
              className="quiet-button"
              disabled={busy}
              onClick={closeConfirm}
            >
              CANCEL
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void run(confirm.action, confirm.revision)}
            >
              CONFIRM
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
