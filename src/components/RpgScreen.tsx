"use client";
import ItemIcon from "./ItemIcon";
export { default as ItemIcon } from "./ItemIcon";
import CharacterPreview from "./CharacterPreview";
import EquippedWeapon from "./EquippedWeapon";
import RiftOutfitters from "./RiftOutfitters";
import {
  WeaponEvolutionPreview,
  WeaponEvolutionReveal,
} from "./WeaponEvolution";
import { evolutionTier } from "@/game/presentation/weapon-visual";
import ActionReceipt from "./ActionReceipt";
import {
  committedRpgVisual,
  type ActionVisualReceipt,
} from "@/game/presentation/action-feedback";
import { resolveEquippedWeapon } from "@/game/rpg/stats";
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
  GENERAL_SHOP,
  RECIPES,
  UPGRADES,
  statNames,
} from "@/game/rpg/content";
import { inventory, usedSlots } from "@/game/rpg/inventory";
import { bagUpgradeCost } from "@/game/rpg/bag";
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
import { audio } from "@/game/audio/engine";
import { CHARACTERS, type CharacterId } from "@/game/loadout";
import { preferences } from "@/game/persistence/preferences";
import SaveIndicator from "./SaveIndicator";
import { useI18n } from "@/i18n/useI18n";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  SLOTS,
  RARITY_IDS,
  type EquipmentInstance,
  type InventoryEntry,
  type StatKey,
} from "@/game/rpg/model";
import type { WeaponId } from "@/game/content/forest";

type Tab =
  | "inventory"
  | "character"
  | "blacksmith"
  | "shop"
  | "outfitters"
  | "history";
type Confirm = {
  title: string;
  action: ActionBody;
  revision: number;
  content: ReactNode;
};
export function formatStat(key: StatKey, value: number) {
  return ["attackSpeed", "critChance", "critDamage", "area"].includes(key)
    ? `${(value * 100).toFixed(1)}%`
    : value.toFixed(["regen", "damage"].includes(key) ? 1 : 0);
}
function StatsComparison({
  profile,
  candidate,
  weapon,
  character,
}: {
  profile: Progress;
  candidate: EquipmentInstance;
  weapon: WeaponId;
  character: CharacterId;
}) {
  const { text } = useI18n();
  const current = calculateStats(profile, weapon, character),
    preview = structuredClone(profile),
    slot = ITEMS[candidate.definitionId].slot!;
  preview.rpg!.equipment = preview
    .rpg!.equipment.filter((e) => e.id !== candidate.id)
    .concat(candidate);
  preview.rpg!.equipped[slot] = candidate.id;
  const next = calculateStats(preview, weapon, character);
  return (
    <div className="rpg-comparison">
      <span className="rpg-caption">{text("CAMPAIGN BUILD COMPARISON")}</span>
      {(Object.keys(statNames) as StatKey[]).map((key) => {
        const delta = next[key] - current[key];
        return (
          <div key={key}>
            <span>{text(statNames[key])}</span>
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
        <span>{text("Attack interval")}</span>
        <b>
          {current.interval.toFixed(2)}
          {text("s")}
        </b>
        <strong>
          {next.interval.toFixed(2)}
          {text("s")}
        </strong>
      </div>
      <div>
        <span>{text("Power")}</span>
        <b>{current.power}</b>
        <strong className={next.power > current.power ? "positive" : ""}>
          {next.power}
        </strong>
      </div>
    </div>
  );
}
function itemDescription(e: InventoryEntry, text: (value: string) => string) {
  const d = ITEMS[e.definitionId];
  return `${text(d.name)}${e.equipment ? ` · ${text(RARITIES[e.equipment.rarity].name)} · Item Lv ${e.equipment.level} · +${e.equipment.enhancement}` : ` ×${e.quantity}`}\n${text(d.description)}`;
}
export default function RpgScreen({
  onBack,
  weapon = "arcane",
  character: requestedCharacter = "wanderer",
  initialTab = "inventory",
  focusRecipes = false,
  initialMerchantCategory,
  onCommitted,
}: {
  onBack: () => void;
  weapon?: WeaponId;
  character?: CharacterId;
  initialTab?: Tab;
  focusRecipes?: boolean;
  initialMerchantCategory?: "armor" | "helmet" | "pants" | "boots";
  onCommitted?: (receipt: ActionVisualReceipt, progress: Progress) => void;
}) {
  const { text } = useI18n();
  const [profile, setProfile] = useState<Progress | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState<Tab>(initialTab),
    [selection, setSelection] = useState("starter-weapon"),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("rarity"),
    [amount, setAmount] = useState(1),
    [confirm, setConfirm] = useState<Confirm | null>(null),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(true),
    [flash, setFlash] = useState(""),
    [evolution, setEvolution] = useState<{
      before: EquipmentInstance;
      after: EquipmentInstance;
    } | null>(null);
  const closeEvolution = useCallback(() => setEvolution(null), []);
  const [visualReceipt, setVisualReceipt] =
    useState<ActionVisualReceipt | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const selectionAnchor = useRef<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const details = useRef<HTMLElement | null>(null),
    bagPanel = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (focusRecipes && profile) {
      const frame = requestAnimationFrame(() =>
        document
          .querySelector(".rpg-recipes")
          ?.scrollIntoView({ block: "center" }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [focusRecipes, !!profile]);
  function inspect(id: string) {
    setSelection(id);
    setFlash("");
    if (matchMedia("(max-width:760px)").matches)
      requestAnimationFrame(() =>
        details.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
  }
  const guard = useRef(false);
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
      setSound(preferences.get("nowrift-rpg-sfx") !== "off");
    } catch {
      /* Optional preference. */
    }
    return () => {
      cancelled = true;
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
      try {
        const result = await campaignRepository.act({
          id: "action-" + crypto.randomUUID(),
          at: Date.now(),
          slotId: profile.local?.id,
          expectedRevision: revision ?? profile.rpg!.revision,
          action,
        });
        setProfile(result.progress);
        setNotice(result.entry?.message ?? "Action already applied.");
        setContextMenu(null);
        if (action.type === "bulkSell" || action.type === "bulkDismantle") {
          setSelectedIds([]);
          setMultiMode(false);
        }
        const receipt = committedRpgVisual(profile, result, action);
        if (receipt) {
          setVisualReceipt(receipt);
          onCommitted?.(receipt, result.progress);
        }
        if (result.entry?.enhancement) {
          const success = result.entry.enhancement.success;
          const before = profile.rpg!.equipment.find(
            (e) => e.id === result.entry?.itemId,
          );
          const after = result.progress.rpg!.equipment.find(
            (e) => e.id === result.entry?.itemId,
          );
          if (
            receipt &&
            success &&
            before &&
            after &&
            ITEMS[after.definitionId]?.weapon &&
            evolutionTier(after.enhancement) > evolutionTier(before.enhancement)
          )
            setEvolution({
              before: structuredClone(before),
              after: structuredClone(after),
            });
          setFlash(success ? "success" : "failure");
          if (sound) audio.play(success ? "upgrade" : "error");
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
    [profile, sound, onCommitted],
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
  useEffect(() => {
    const visible = new Set(bag.map((entry) => entry.id));
    setSelectedIds((previous) => {
      const remaining = previous.filter((id) => visible.has(id));
      return remaining.length === previous.length ? previous : remaining;
    });
  }, [bag]);
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest(".rpg-context-menu"))
        setContextMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    document
      .querySelector<HTMLButtonElement>(".rpg-context-menu button")
      ?.focus();
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [contextMenu]);
  useEffect(
    () => () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
    [],
  );
  const selectedBag = bag.filter((entry) => selectedIds.includes(entry.id));
  const selectedGold = selectedBag.reduce(
    (total, entry) => total + sellPrice(entry) * entry.quantity,
    0,
  );
  const protectedSelection = selectedBag.some(
    (entry) =>
      entry.equipped ||
      entry.locked ||
      entry.favorite ||
      (!!entry.equipment && entry.id.startsWith("starter-")),
  );
  const dismantleSelectionValid =
    selectedBag.length > 0 &&
    !protectedSelection &&
    selectedBag.every((entry) => !!entry.equipment);
  const contextEntry = contextMenu
    ? all.find((entry) => entry.id === contextMenu.id)
    : undefined;
  function ask(title: string, action: ActionBody, content: ReactNode) {
    if (profile && !guard.current)
      setConfirm({ title, action, revision: profile.rpg!.revision, content });
  }
  function protectReason(entry: InventoryEntry) {
    return entry.equipped
      ? "Unequip before selling or dismantling."
      : entry.equipment && entry.id.startsWith("starter-")
        ? "Starter equipment is protected."
        : entry.locked
          ? "Unlock this item first."
          : entry.favorite
            ? "Unfavorite this protected item first."
            : "";
  }
  function toggleSelection(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((candidate) => candidate !== id)
        : [...previous, id],
    );
    selectionAnchor.current = id;
    setMultiMode(true);
    setSelection(id);
  }
  function onItemClick(
    entry: InventoryEntry,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (!multiMode && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      inspect(entry.id);
      return;
    }
    if (event.shiftKey && selectionAnchor.current) {
      const from = bag.findIndex((e) => e.id === selectionAnchor.current);
      const to = bag.findIndex((e) => e.id === entry.id);
      if (from >= 0 && to >= 0) {
        const range = bag.slice(Math.min(from, to), Math.max(from, to) + 1);
        setSelectedIds((previous) => [
          ...new Set([...previous, ...range.map((e) => e.id)]),
        ]);
      } else toggleSelection(entry.id);
    } else {
      toggleSelection(entry.id);
    }
    selectionAnchor.current = entry.id;
    setMultiMode(true);
    setSelection(entry.id);
  }
  function askBulk(kind: "sell" | "dismantle") {
    if (
      selectedBag.length === 0 ||
      protectedSelection ||
      (kind === "dismantle" && !dismantleSelectionValid)
    )
      return;
    if (kind === "sell") {
      ask(
        "Confirm bulk sale",
        {
          type: "bulkSell",
          items: selectedBag.map((entry) => ({
            itemId: entry.id,
            quantity: entry.quantity,
          })),
        },
        <p>
          {text("Sell selected items")} ({selectedBag.length}) ·{" "}
          {selectedBag.reduce((sum, entry) => sum + entry.quantity, 0)}{" "}
          {text("units")} · +{selectedGold} {text("GOLD")}.{" "}
          {text("This cannot be undone.")}
        </p>,
      );
      return;
    }
    const rewards: Record<string, number> = {};
    for (const entry of selectedBag)
      for (const [id, count] of Object.entries(dismantleYield(entry)))
        rewards[id] = (rewards[id] ?? 0) + count;
    ask(
      "Confirm bulk dismantle",
      { type: "bulkDismantle", itemIds: selectedBag.map((entry) => entry.id) },
      <div>
        <p>
          {text("Dismantle selected equipment")} ({selectedBag.length}).{" "}
          {text("This cannot be undone.")}
        </p>
        <p>
          {Object.entries(rewards)
            .filter(([, n]) => n > 0)
            .map(([id, n]) => `${text(ITEMS[id].name)} ×${n}`)
            .join(" · ")}
        </p>
      </div>,
    );
  }
  function askQuickSale(entry: InventoryEntry) {
    const count = entry.quantity;
    ask(
      "Confirm sale",
      { type: "sell", itemId: entry.id, quantity: count },
      <p>
        {text("Sell")} {count} × {text(ITEMS[entry.definitionId].name)}{" "}
        {text("for")} {sellPrice(entry) * count} {text("GOLD")}.{" "}
        {text("This cannot be undone.")}
      </p>,
    );
    setContextMenu(null);
  }
  function askQuickDismantle(entry: InventoryEntry) {
    ask(
      "Confirm dismantle",
      { type: "dismantle", itemId: entry.id, quantity: 1 },
      <p>
        {text("Dismantle")} {text(ITEMS[entry.definitionId].name)}?{" "}
        {Object.entries(dismantleYield(entry))
          .filter(([, n]) => n > 0)
          .map(([id, n]) => `${text(ITEMS[id].name)} ×${n}`)
          .join(" · ")}{" "}
        {text("This cannot be undone.")}
      </p>,
    );
    setContextMenu(null);
  }
  function tile(e: InventoryEntry) {
    return (
      <button
        key={e.id}
        type="button"
        className={`rpg-cell ${selection === e.id ? "selected" : ""} ${selectedIds.includes(e.id) ? "multi-selected" : ""}`}
        style={
          {
            "--item-color": RARITIES[e.equipment?.rarity ?? "common"].color,
          } as React.CSSProperties
        }
        onClick={(event) => onItemClick(e, event)}
        onContextMenu={(event) => {
          event.preventDefault();
          if (busy) return;
          setSelection(e.id);
          setContextMenu({
            id: e.id,
            x: Math.max(8, Math.min(event.clientX, window.innerWidth - 246)),
            y: Math.max(8, Math.min(event.clientY, window.innerHeight - 340)),
          });
        }}
        onTouchStart={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            if (!selectedIds.includes(e.id)) toggleSelection(e.id);
            else setMultiMode(true);
          }, 480);
        }}
        onTouchMove={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        onTouchEnd={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        onTouchCancel={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        aria-label={itemDescription(e, text)}
        title={itemDescription(e, text)}
        aria-pressed={
          multiMode ? selectedIds.includes(e.id) : selection === e.id
        }
      >
        <ItemIcon id={e.definitionId} weapon={e.equipment} size={40} />
        {e.quantity > 1 && <span className="rpg-quantity">{e.quantity}</span>}
        {e.equipment && e.equipment.enhancement > 0 && (
          <span className="rpg-enhance-tag">+{e.equipment.enhancement}</span>
        )}
        {(e.favorite || e.locked) && (
          <span className="rpg-protect-tag">
            {e.locked ? text("L") : text("F")}
          </span>
        )}
        {e.equipped && <span className="rpg-equipped-tag">{text("E")}</span>}
        {selectedIds.includes(e.id) && (
          <span className="rpg-multi-check" aria-hidden="true">
            ✓
          </span>
        )}
      </button>
    );
  }
  if (!profile)
    return (
      <main className="rpg-page">
        <header className="topbar">
          <Brand />
          <button className="quiet-button" onClick={onBack}>
            {text("← HUB")}
          </button>
        </header>
        <div className="rpg-loading">
          <h1>{text("Your satchel awaits.")}</h1>
          <p role={error ? "alert" : "status"}>
            {error || "Reading your local inventory…"}
          </p>
          <p className="muted">
            {text(
              "Existing campaign saves are preserved. No online account is required.",
            )}
          </p>
        </div>
      </main>
    );
  const character = profile.local?.character ?? requestedCharacter;
  const r = profile.rpg!,
    stats = calculateStats(profile, weapon, character),
    level = characterLevel(profile.xp),
    locked = chosen ? protectReason(chosen) : "";
  const expansionCost = bagUpgradeCost(r.capacity);
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
          <SaveIndicator />
          <LanguageSwitcher compact />
          <button
            className="quiet-button"
            aria-pressed={sound}
            onClick={() => {
              const next = !sound;
              setSound(next);
              try {
                preferences.set("nowrift-rpg-sfx", next ? "on" : "off");
              } catch {
                /* optional */
              }
            }}
          >
            {sound ? text("SFX ON") : text("SFX OFF")}
          </button>
          <button className="quiet-button" disabled={busy} onClick={onBack}>
            {text("← RETURN TO HUB")}
          </button>
        </div>
      </header>
      <div className="rpg-shell">
        {tab !== "outfitters" && (
          <div className="rpg-heading">
            <div>
              <span className="eyebrow">
                {text("THE WANDERER’S SANCTUARY")}
              </span>
              <h1>
                {text("Every relic")} <em>{text("tells a story.")}</em>
              </h1>
            </div>
            <div className="rpg-wallet">
              <span>{text("YOUR COIN PURSE")}</span>
              <strong data-testid="rpg-gold">
                {profile.gold.toLocaleString()} <small>{text("GOLD")}</small>
              </strong>
              <small>
                {text("LEVEL")} {level.level}
                {text("· POWER")} {stats.power}
              </small>
            </div>
          </div>
        )}
        <nav className="rpg-tabs" aria-label={text("RPG systems")}>
          {(
            [
              "inventory",
              "character",
              "blacksmith",
              "outfitters",
              "shop",
              "history",
            ] as Tab[]
          ).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              className={tab === t ? "selected" : ""}
              onClick={() => {
                setTab(t);
                setFlash("");
                setFilter("all");
                setSelectedIds([]);
                setMultiMode(false);
                setContextMenu(null);
              }}
            >
              {t === "outfitters"
                ? text("RIFT OUTFITTERS")
                : t === "shop"
                  ? text("THE TRADER")
                  : t === "history"
                    ? text("JOURNAL")
                    : text(t.toUpperCase())}
            </button>
          ))}
        </nav>
        <div className="rpg-notices" aria-live="polite">
          {error && (
            <p className="notice negative" role="alert">
              {text(error.replace(/^Error: /, ""))}
            </p>
          )}
          {notice && (
            <p className={`rpg-notice ${flash}`} role="status">
              {text(notice)}
            </p>
          )}
          {busy && <p className="muted">{text("Saving transaction…")}</p>}
          {visualReceipt && (
            <ActionReceipt
              receipt={visualReceipt}
              onFinish={() =>
                setVisualReceipt((current) =>
                  current?.id === visualReceipt.id ? null : current,
                )
              }
            />
          )}
        </div>
        {r.overflow.length > 0 && (
          <section className="rpg-overflow">
            <div>
              <span className="eyebrow">
                {text("UNCLAIMED LOOT /")} {r.overflow.length}
                {text("PARCELS")}
              </span>
              <p>
                {text(
                  "Your bag was full. These rewards remain safe until you make room.",
                )}
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
                    weapon={o.equipment}
                    size={28}
                  />
                  <span>
                    {text(
                      ITEMS[o.equipment?.definitionId ?? o.definitionId!].name,
                    )}
                    {o.quantity ? ` ×${o.quantity}` : ""}
                  </span>
                  {text("CLAIM")}
                </button>
              ))}
            </div>
          </section>
        )}
        {tab === "history" ? (
          <section className="rpg-panel rpg-journal">
            <span className="eyebrow">{text("EVERY COIN ACCOUNTED FOR")}</span>
            <h2>{text("Transaction journal")}</h2>
            <p className="muted">
              {text(
                "Latest 100 entries shown. Every mutation is recorded locally; client-side saves are not tamper-proof.",
              )}
            </p>
            {r.history.length ? (
              r.history
                .slice(-100)
                .reverse()
                .map((e) => (
                  <article key={e.id}>
                    <span className="rpg-caption">
                      {e.kind.toUpperCase()} ·{" "}
                      {e.at
                        ? new Date(e.at).toLocaleString()
                        : text("LEGACY IMPORT")}
                    </span>
                    <strong>{text(e.message)}</strong>
                    <b className={e.gold >= 0 ? "positive" : "negative"}>
                      {e.gold >= 0 ? "+" : ""}
                      {e.gold}
                      {text("GOLD")}
                    </b>
                    <p>{e.items.map(text).join(" · ")}</p>
                    {e.enhancement && (
                      <p>
                        {text("Chance")}{" "}
                        {(e.enhancement.effective * 100).toFixed(0)}
                        {text("% · Pity")}
                        {e.enhancement.pityBefore} → {e.enhancement.pityAfter} ·
                        +{e.enhancement.before} → +{e.enhancement.after}
                      </p>
                    )}
                  </article>
                ))
            ) : (
              <p>{text("Your journey has yet to leave a mark.")}</p>
            )}
          </section>
        ) : tab === "outfitters" ? (
          <RiftOutfitters
            initialCategory={initialMerchantCategory}
            profile={profile}
            character={character}
            busy={busy}
            onBuy={(offer) =>
              ask(
                "Confirm purchase",
                { type: "buy", offerId: offer.id, quantity: 1 },
                <p>
                  {text(ITEMS[offer.item].name)} ·{" "}
                  {text(RARITIES[offer.rarity!].name)} · {text("Item level")}{" "}
                  {offer.level}
                  <br />
                  {offer.price} {text("Gold")}
                </p>,
              )
            }
            onEquip={(itemId) => void run({ type: "equip", itemId })}
            onUnequip={(slot) => void run({ type: "unequip", slot })}
            onSell={(candidate) => {
              const entry = all.find((e) => e.id === candidate.id)!;
              ask(
                "Confirm sale",
                { type: "sell", itemId: candidate.id, quantity: 1 },
                <p>
                  {text(ITEMS[candidate.definitionId].name)} +
                  {candidate.enhancement} · {sellPrice(entry)} {text("Gold")}
                </p>,
              );
            }}
            onForge={(id) => {
              setSelection(id);
              setTab("blacksmith");
            }}
          />
        ) : tab === "shop" ? (
          <section className="rpg-shop">
            <div className="rpg-panel">
              <span className="eyebrow">
                {text("MERRICK / THE ROADWARD TRADER")}
              </span>
              <h2>{text("Supplies for the road.")}</h2>
              <p className="muted">
                {text(
                  "Fixed wares and honest prices. Selling returns a fraction of purchase value.",
                )}
              </p>
              <label className="rpg-amount">
                {text("Purchase quantity")}
                <input
                  aria-label={text("Purchase quantity")}
                  type="number"
                  min={1}
                  max={99}
                  value={Number.isNaN(amount) ? "" : amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <div className="rpg-offers">
                {GENERAL_SHOP.map((offer) => {
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
                      <ItemIcon
                        id={offer.item}
                        weapon={preview ?? undefined}
                        size={56}
                      />
                      <div>
                        <span className="rpg-caption">
                          {offer.rarity
                            ? `${offer.rarity.toUpperCase()} · ITEM LV ${offer.level}`
                            : def.kind.toUpperCase()}
                        </span>
                        <h3>{text(def.name)}</h3>
                        <p>{text(def.description)}</p>
                        {preview && (
                          <p className="rpg-offer-stats">
                            {Object.entries(itemStats(preview))
                              .filter(([, v]) => v > 0)
                              .map(
                                ([key, v]) =>
                                  `${text(statNames[key as StatKey])} +${formatStat(key as StatKey, v)}`,
                              )
                              .join(" · ")}
                          </p>
                        )}
                        <strong>
                          {offer.price * amount}
                          {text("GOLD")}
                        </strong>
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
                                {text("Buy")} {amount} × {text(def.name)}
                                {text("for")}{" "}
                                <strong>
                                  {offer.price * amount}
                                  {text("gold")}
                                </strong>
                                {text("? Available:")}
                                {profile.gold}
                                {text(
                                  "gold. Equipment rolls match the displayed fixed shop attributes.",
                                )}
                              </p>,
                            )
                          }
                        >
                          {text("BUY")} {def.name.toUpperCase()}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <h2>{text("Material crafting")}</h2>
              <div className="rpg-recipes">
                {RECIPES.map((recipe) => (
                  <article key={recipe.id}>
                    <ItemIcon id={recipe.output} />
                    <div>
                      <h3>{text(recipe.name)}</h3>
                      <p>
                        {recipe.gold}
                        {text("gold ·")}{" "}
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
                              {text("Consume")} {recipe.gold}
                              {text("gold and")}{" "}
                              {Object.entries(recipe.materials)
                                .map(
                                  ([id, n]) => `${n} ${text(ITEMS[id].name)}`,
                                )
                                .join(", ")}{" "}
                              {text("to create")}{" "}
                              {text(ITEMS[recipe.output].name)}?
                            </p>,
                          )
                        }
                      >
                        {text("CRAFT")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <aside className="rpg-panel">
              <span className="eyebrow">{text("SELL FROM YOUR SATCHEL")}</span>
              <h2>{text("Trade unwanted finds.")}</h2>
              <p className="muted">
                {text(
                  "Select any owned item in Inventory to sell it. Equipped, locked and favorite items are protected.",
                )}
              </p>
              <button
                className="rpg-button"
                onClick={() => setTab("inventory")}
              >
                {text("OPEN INVENTORY")}
              </button>
              <div className="rpg-materials">
                {Object.entries(profile.materials)
                  .filter(([, n]) => n > 0)
                  .map(([id, n]) => (
                    <div key={id}>
                      <ItemIcon id={id} size={28} />
                      <span>{text(ITEMS[id].name)}</span>
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
                <span>{text(CHARACTERS[character].name.toUpperCase())}</span>
                <small>
                  {text("LV")} {level.level}
                </small>
              </div>
              <EquippedWeapon
                weapon={resolveEquippedWeapon(profile, character)}
              />
              <div className="rpg-paperdoll">
                <CharacterPreview
                  className="rpg-avatar"
                  character={character}
                  outfit={profile.local?.world?.outfit ?? "moss"}
                  weapon={resolveEquippedWeapon(profile, character)}
                  profile={profile}
                  pose={visualReceipt?.pose ?? "idle"}
                  actionKey={visualReceipt?.id}
                  size={112}
                />
                <div className="rpg-slots">
                  {SLOTS.map((slot) => {
                    const e = all.find((e) => e.id === r.equipped[slot]);
                    return (
                      <button
                        key={slot}
                        data-slot={slot}
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
                        <span>{text(slot.toUpperCase())}</span>
                        {e ? (
                          <ItemIcon
                            id={e.definitionId}
                            weapon={e.equipment}
                            size={44}
                          />
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
                <span>{text("CAMPAIGN POWER")}</span>
                <strong>{stats.power}</strong>
              </div>
              <div className="rpg-level">
                <span>
                  {text("CHARACTER LEVEL")} {level.level}
                </span>
                <b>
                  {level.xp} / {level.next || "MAX"}
                  {text("XP")}
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
                {text(
                  "Permanent progression is separate from temporary run levels. Your equipped inventory weapon determines campaign attacks.",
                )}
              </p>
              <dl className="rpg-stat-list">
                {(Object.keys(statNames) as StatKey[]).map((key) => (
                  <div key={key}>
                    <dt>{text(statNames[key])}</dt>
                    <dd>{formatStat(key, stats[key])}</dd>
                  </div>
                ))}
                <div>
                  <dt>{text("Attack interval")}</dt>
                  <dd>
                    {stats.interval.toFixed(2)}
                    {text("s")}
                  </dd>
                </div>
              </dl>
            </aside>
            <section ref={bagPanel} className="rpg-panel rpg-bag">
              {tab === "character" ? (
                <>
                  <span className="eyebrow">{text("A LASTING STRENGTH")}</span>
                  <h2>{text("Permanent disciplines")}</h2>
                  <p className="muted">
                    {text(
                      "Small lasting bonuses complement each run’s blessings. Ranks are capped at ten.",
                    )}
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
                            {text(u.name)} <small>{rank}/10</small>
                          </h3>
                          <p>{text(u.description)}</p>
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
                                  {text("Spend")} {cost}
                                  {text("gold and")} {rank + 1}
                                  {text("Copper Ore for rank")}
                                  {rank + 1}
                                  {text("of")} {text(u.name)}?
                                </p>,
                              )
                            }
                          >
                            {rank === 10
                              ? text("MASTERED")
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
                        ? text("SELECT EQUIPMENT")
                        : text("YOUR INVENTORY")}
                    </span>
                    <small data-testid="bag-capacity">
                      {usedSlots(profile)} / {r.capacity}
                    </small>
                  </div>
                  {tab === "inventory" && (
                    <div className="rpg-bag-expansion">
                      <div>
                        <strong>{text("BACKPACK CAPACITY")}</strong>
                        <small>
                          {usedSlots(profile)} / {r.capacity} {text("slots")}
                        </small>
                        <small>
                          {expansionCost === null
                            ? text("MAX CAPACITY")
                            : `+10 ${text("slots")} · ${expansionCost.toLocaleString()} ${text("GOLD")}`}
                        </small>
                      </div>
                      <button
                        className="rpg-button"
                        data-testid="expand-backpack"
                        disabled={
                          busy ||
                          expansionCost === null ||
                          profile.gold < expansionCost
                        }
                        onClick={() => {
                          if (expansionCost === null) return;
                          ask(
                            "Confirm bag expansion",
                            { type: "expandBag" },
                            <p>
                              {text("Expand backpack by 10 slots")} ·{" "}
                              {expansionCost.toLocaleString()} {text("GOLD")}.
                            </p>,
                          );
                        }}
                      >
                        {expansionCost === null
                          ? text("MAX CAPACITY")
                          : text("EXPAND BACKPACK")}
                      </button>
                    </div>
                  )}
                  <div className="rpg-bag-tools">
                    <label>
                      {text("Filter")}
                      <select
                        aria-label={text("Inventory category")}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        {[
                          "all",
                          "equipment",
                          "weapon",
                          "armor",
                          "helmet",
                          "pants",
                          "boots",
                          "ring",
                          "necklace",
                          "material",
                          "consumable",
                          "favorites",
                        ].map((x) => (
                          <option key={x} value={x}>
                            {text(x.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {text("Sort")}
                      <select
                        aria-label={text("Inventory sort")}
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="rarity">{text("RARITY")}</option>
                        <option value="type">{text("TYPE")}</option>
                        <option value="power">{text("POWER")}</option>
                        <option value="name">{text("NAME")}</option>
                      </select>
                    </label>
                  </div>
                  {tab === "inventory" && (
                    <div className="rpg-bulk-toolbar" aria-live="polite">
                      <button
                        type="button"
                        className="rpg-button"
                        aria-pressed={multiMode}
                        onClick={() => {
                          setMultiMode(!multiMode);
                          setSelectedIds([]);
                          selectionAnchor.current = null;
                        }}
                      >
                        {multiMode
                          ? text("CANCEL SELECTION")
                          : text("SELECT ITEMS")}
                      </button>
                      {multiMode && (
                        <>
                          <span>
                            {text("Selected")} {selectedBag.length}
                          </span>
                          <button
                            type="button"
                            className="rpg-button"
                            onClick={() =>
                              setSelectedIds(
                                bag
                                  .filter((entry) => !protectReason(entry))
                                  .map((entry) => entry.id),
                              )
                            }
                          >
                            {text("SELECT ELIGIBLE VISIBLE")}
                          </button>
                          <button
                            type="button"
                            className="rpg-button"
                            onClick={() => setSelectedIds([])}
                          >
                            {text("CLEAR")}
                          </button>
                          <button
                            type="button"
                            className="rpg-button"
                            disabled={
                              busy ||
                              selectedBag.length === 0 ||
                              protectedSelection
                            }
                            onClick={() => askBulk("sell")}
                          >
                            {text("SELL SELECTED")} +{selectedGold}{" "}
                            {text("GOLD")}
                          </button>
                          <button
                            type="button"
                            className="rpg-button danger"
                            disabled={busy || !dismantleSelectionValid}
                            onClick={() => askBulk("dismantle")}
                          >
                            {text("DISMANTLE SELECTED")}
                          </button>
                          {protectedSelection && (
                            <small className="rpg-bulk-warning">
                              {text(
                                "Remove equipped, locked, favorite or starter items from selection.",
                              )}
                            </small>
                          )}
                          {!protectedSelection &&
                            selectedBag.length > 0 &&
                            !dismantleSelectionValid && (
                              <small className="rpg-bulk-warning">
                                {text("Only equipment can be dismantled.")}
                              </small>
                            )}
                        </>
                      )}
                    </div>
                  )}
                  <div
                    className="rpg-grid"
                    aria-label={text("Inventory slots")}
                  >
                    {bag.map(tile)}
                    {Array.from(
                      {
                        length: Math.max(
                          0,
                          (tab === "blacksmith" ? SLOTS.length : r.capacity) -
                            bag.length,
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
                    {text(
                      "Equipped items occupy the seven character slots. Stackable resources use one bag slot per type. Excess earned loot remains in protected parcels.",
                    )}
                  </p>
                  {tab === "blacksmith" && (
                    <div className="rpg-forge-note">
                      <span className="eyebrow">
                        {text("BRAN / THE RIFT FORGE")}
                      </span>
                      <h2>{text("Temper your legacy.")}</h2>
                      <p>
                        {text(
                          "Choose owned gear, inspect its odds and resources, then confirm a single attempt. No equipment is destroyed by enhancement.",
                        )}
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
                {text("↑ BACK TO INVENTORY")}
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
                    <ItemIcon
                      id={chosen.definitionId}
                      weapon={item}
                      size={80}
                    />
                    <span>
                      {item
                        ? RARITIES[item.rarity].name.toUpperCase()
                        : ITEMS[chosen.definitionId].kind.toUpperCase()}
                    </span>
                    <h2>
                      {text(ITEMS[chosen.definitionId].name)}
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
                  {item && <WeaponEvolutionPreview item={item} />}
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
                      {chosen.favorite ? text("UNFAVORITE") : text("FAVORITE")}
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
                      {chosen.locked ? text("UNLOCK ITEM") : text("LOCK ITEM")}
                    </button>
                  </div>
                  {item && (
                    <>
                      <div className="rpg-item-stats">
                        {Object.entries(itemStats(item))
                          .filter(([, v]) => v > 0)
                          .map(([key, v]) => (
                            <div key={key}>
                              <span>{text(statNames[key as StatKey])}</span>
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
                        {chosen.equipped ? text("UNEQUIP") : text("EQUIP ITEM")}
                      </button>
                      <StatsComparison
                        profile={profile}
                        candidate={item}
                        weapon={weapon}
                        character={character}
                      />
                    </>
                  )}
                  {item && tab === "blacksmith" ? (
                    <section className="rpg-enhancement-panel">
                      <h3>
                        {text("Enhancement +")}
                        {item.enhancement} →{" "}
                        {Math.min(15, item.enhancement + 1)}
                      </h3>
                      {quote ? (
                        <>
                          <div className="rpg-chance">
                            <span>
                              {text("BASE")} {(quote.base * 100).toFixed(0)}%
                            </span>
                            <span>
                              {text("PITY +")}
                              {(quote.bonus * 100).toFixed(0)}%
                            </span>
                            <strong>
                              {(quote.effective * 100).toFixed(0)}%
                              <small>{text("SUCCESS CHANCE")}</small>
                            </strong>
                          </div>
                          <p>{text(quote.failure)}</p>
                          <div className="rpg-costs">
                            <div
                              className={
                                profile.gold < quote.gold ? "negative" : ""
                              }
                            >
                              {text("Gold")}{" "}
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
                                {text(ITEMS[id].name)}
                                <b>
                                  {n} / {profile.materials[id] ?? 0}
                                </b>
                              </div>
                            ))}
                          </div>
                          <div className="rpg-prediction">
                            <span className="rpg-caption">
                              {text("ON SUCCESS")}
                            </span>
                            {Object.entries(
                              itemStats(item, item.enhancement + 1),
                            )
                              .filter(([, v]) => v > 0)
                              .map(([key, v]) => (
                                <div key={key}>
                                  {text(statNames[key as StatKey])}
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
                                    {text(ITEMS[item.definitionId].name)}{" "}
                                    <strong>
                                      +{item.enhancement} → +
                                      {item.enhancement + 1}
                                    </strong>
                                  </p>
                                  <p>
                                    {text("Base")}{" "}
                                    {(quote.base * 100).toFixed(0)}
                                    {text("% · Pity +")}
                                    {(quote.bonus * 100).toFixed(0)}
                                    {text("% · Effective")}{" "}
                                    <strong>
                                      {(quote.effective * 100).toFixed(0)}%
                                    </strong>
                                  </p>
                                  <p>
                                    {quote.gold} {text("gold (owned")}{" "}
                                    {profile.gold})
                                    <br />
                                    {Object.entries(quote.materials)
                                      .map(
                                        ([id, n]) =>
                                          `${text(ITEMS[id].name)}: ${n} (owned ${profile.materials[id] ?? 0})`,
                                      )
                                      .join(" · ")}
                                  </p>
                                  <p>{text(quote.failure)}</p>
                                  <p>{text(quote.pityDescription)}</p>
                                </>,
                              )
                            }
                          >
                            {text("ENHANCE EQUIPMENT")}
                          </button>
                          {item.locked && (
                            <p className="muted">
                              {text("Unlock this item before enhancing.")}
                            </p>
                          )}
                          {!costAvailable && (
                            <p className="muted">
                              {text(
                                "Earn or purchase the missing resources first.",
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="positive">
                          {text("Maximum enhancement +15 reached.")}
                        </p>
                      )}
                      <h3>{text("Item enhancement history")}</h3>
                      <div className="rpg-enhancement-history">
                        {r.history
                          .filter((e) => e.itemId === item.id && e.enhancement)
                          .slice()
                          .reverse()
                          .map((e) => (
                            <p key={e.id}>
                              {text(e.message)}
                              {text("Chance")}{" "}
                              {(e.enhancement!.effective * 100).toFixed(0)}
                              {text("% · Pity")}
                              {e.enhancement!.pityAfter}
                            </p>
                          ))}
                        {!r.history.some(
                          (e) => e.itemId === item.id && e.enhancement,
                        ) && <p>{text("No attempts yet.")}</p>}
                      </div>
                    </section>
                  ) : (
                    item && (
                      <button
                        className="rpg-button"
                        onClick={() => setTab("blacksmith")}
                      >
                        {text("VISIT THE BLACKSMITH →")}
                      </button>
                    )
                  )}
                  <div className="rpg-disposal">
                    <h3>{text("Trade & salvage")}</h3>
                    {locked && <p className="muted">{locked}</p>}
                    {!item && (
                      <label className="rpg-amount">
                        {text("Sell quantity")}
                        <input
                          aria-label={text("Sell quantity")}
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
                            {text("Sell")} {n} ×{" "}
                            {text(ITEMS[chosen.definitionId].name)}
                            {text("for")} {sellPrice(chosen) * n}
                            {text("gold? This item will leave your inventory.")}
                          </p>,
                        );
                      }}
                    >
                      {text("SELL FOR")}{" "}
                      {sellPrice(chosen) * (item ? 1 : amount)}
                      {text("GOLD")}
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
                              {text("Dismantle")}{" "}
                              {text(ITEMS[item.definitionId].name)}{" "}
                              {text("permanently? Receive")}{" "}
                              {Object.entries(dismantleYield(chosen))
                                .filter(([, n]) => n > 0)
                                .map(([id, n]) => `${ITEMS[id].name} ×${n}`)
                                .join(" · ")}
                              {text(". This cannot be undone.")}
                            </p>,
                          )
                        }
                      >
                        {text("DISMANTLE EQUIPMENT")}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="rpg-empty-detail">
                  <ItemIcon id="forest-ring" size={64} />
                  <h2>{text("A story untold.")}</h2>
                  <p>
                    {text(
                      "Select an item to inspect its attributes, compare equipment, or visit the forge.",
                    )}
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
        <footer className="rpg-footnote">
          {text(
            "LOCAL SINGLE-PLAYER ECONOMY · NO CLOUD SAVE · CAMPAIGN GEAR APPLIES WHEN A NEW RUN BEGINS",
          )}
        </footer>
      </div>
      {contextEntry && contextMenu && (
        <div
          className="rpg-context-menu"
          role="menu"
          aria-label={text("Item actions")}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            );
            if (buttons.length === 0) return;
            const current = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const direction = event.key === "ArrowDown" ? 1 : -1;
            buttons[
              (current + direction + buttons.length) % buttons.length
            ]?.focus();
            event.preventDefault();
          }}
        >
          <strong>{text(ITEMS[contextEntry.definitionId].name)}</strong>
          <button
            role="menuitem"
            onClick={() => {
              inspect(contextEntry.id);
              setContextMenu(null);
            }}
          >
            {text("VIEW DETAILS")}
          </button>
          {contextEntry.equipment && (
            <button
              role="menuitem"
              disabled={
                busy ||
                (contextEntry.equipped && usedSlots(profile) >= r.capacity)
              }
              onClick={() => {
                void run(
                  contextEntry.equipped
                    ? {
                        type: "unequip",
                        slot: ITEMS[contextEntry.definitionId].slot!,
                      }
                    : { type: "equip", itemId: contextEntry.id },
                );
                setContextMenu(null);
              }}
            >
              {contextEntry.equipped ? text("UNEQUIP") : text("EQUIP ITEM")}
            </button>
          )}
          <button
            role="menuitem"
            disabled={busy}
            onClick={() => {
              void run({
                type: "flag",
                itemId: contextEntry.id,
                flag: "locked",
              });
              setContextMenu(null);
            }}
          >
            {contextEntry.locked ? text("UNLOCK ITEM") : text("LOCK ITEM")}
          </button>
          <button
            role="menuitem"
            disabled={busy}
            onClick={() => {
              void run({
                type: "flag",
                itemId: contextEntry.id,
                flag: "favorite",
              });
              setContextMenu(null);
            }}
          >
            {contextEntry.favorite ? text("UNFAVORITE") : text("FAVORITE")}
          </button>
          <button
            role="menuitem"
            disabled={busy || !!protectReason(contextEntry)}
            title={text(protectReason(contextEntry))}
            onClick={() => askQuickSale(contextEntry)}
          >
            {text("SELL")}
          </button>
          {contextEntry.equipment && (
            <button
              role="menuitem"
              disabled={busy || !!protectReason(contextEntry)}
              title={text(protectReason(contextEntry))}
              onClick={() => askQuickDismantle(contextEntry)}
            >
              {text("DISMANTLE")}
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              toggleSelection(contextEntry.id);
              setContextMenu(null);
            }}
          >
            {text("SELECT MULTIPLE")}
          </button>
        </div>
      )}
      {evolution && (
        <WeaponEvolutionReveal {...evolution} onClose={closeEvolution} />
      )}
      {confirm && (
        <Modal title={text(confirm.title)} onClose={closeConfirm}>
          <span className="eyebrow">{text("REVIEW BEFORE YOU COMMIT")}</span>
          <h2>{text(confirm.title)}</h2>
          <div className="rpg-confirm-copy">{confirm.content}</div>
          <div className="dialog-actions">
            <button
              className="quiet-button"
              disabled={busy}
              onClick={closeConfirm}
            >
              {text("CANCEL")}
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void run(confirm.action, confirm.revision)}
            >
              {text("CONFIRM")}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
