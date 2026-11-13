"use client";
import { useState } from "react";
import { RARITY_IDS } from "@/game/rpg/model";
import type { Progress } from "@/game/campaign/progression";
import type { EquipmentInstance, Slot, StatKey } from "@/game/rpg/model";
import type { CharacterId } from "@/game/loadout";
import {
  ITEMS,
  OUTFITTER_OFFERS,
  RARITIES,
  statNames,
  WEARABLE_SLOTS,
  type ShopOffer,
} from "@/game/rpg/content";
import { shopEquipment, sellPrice } from "@/game/rpg/actions";
import { purchaseEligibility } from "@/game/rpg/shop";
import { inventory, usedSlots } from "@/game/rpg/inventory";
import {
  calculateStats,
  itemStats,
  resolveEquippedWeapon,
} from "@/game/rpg/stats";
import { previewEquipment, formatEquipmentStat } from "@/game/rpg/preview";
import { WORLDS } from "@/game/campaign/content";
import { useI18n } from "@/i18n/useI18n";
import CharacterPreview from "./CharacterPreview";
import ItemIcon from "./ItemIcon";
import { Modal } from "./GameUi";

type Callbacks = {
  onBuy: (offer: ShopOffer) => void;
  onEquip: (id: string) => void;
  onUnequip: (slot: Slot) => void;
  onSell: (item: EquipmentInstance) => void;
  onForge: (id: string) => void;
};
const labels = {
  armor: "Chest armor",
  helmet: "Headwear",
  pants: "Legwear",
  boots: "Footwear",
} as const;
const dollOrder = [
  "helmet",
  "weapon",
  "armor",
  "ring",
  "pants",
  "necklace",
  "boots",
] as const;
type Category = (typeof WEARABLE_SLOTS)[number];

function EquipmentDoll({
  profile,
  character,
  category,
  preview,
  onCategory,
}: {
  profile: Progress;
  character: CharacterId;
  category: Category;
  preview: boolean;
  onCategory: (category: Category) => void;
}) {
  const { t, text } = useI18n();
  return (
    <section
      className="outfitters-appearance"
      aria-label={t("outfitters", "Try-on preview")}
    >
      <span className="eyebrow">
        {t(
          "outfitters",
          preview ? "Try-on preview" : "Your equipped appearance",
        )}
      </span>
      <div className="outfitters-doll">
        <CharacterPreview
          profile={profile}
          character={character}
          outfit={profile.local?.world?.outfit ?? "moss"}
          weapon={resolveEquippedWeapon(profile, character)}
          size={160}
        />
        <div className="outfitters-slots">
          {dollOrder.map((slot) => {
            const item = profile.rpg!.equipment.find(
              (item) => item.id === profile.rpg!.equipped[slot],
            );
            const content = (
              <>
                <small>{text(slot.toUpperCase())}</small>
                {item ? (
                  <ItemIcon id={item.definitionId} weapon={item} size={40} />
                ) : (
                  <span className="empty-slot">—</span>
                )}
                <small>{item ? `+${item.enhancement}` : text("Empty")}</small>
              </>
            );
            return (WEARABLE_SLOTS as readonly string[]).includes(slot) ? (
              <button
                key={slot}
                className="outfitters-slot"
                data-slot={slot}
                aria-pressed={slot === category}
                aria-label={t("outfitters", "{slot} equipment slot", {
                  slot: t("outfitters", labels[slot as Category]),
                })}
                onClick={() => onCategory(slot as Category)}
                title={
                  item ? text(ITEMS[item.definitionId].name) : text("Empty")
                }
              >
                {content}
              </button>
            ) : (
              <div key={slot} className="outfitters-slot" data-slot={slot}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
      <p className="muted">
        {t(
          "outfitters",
          "Preview only. Equip an owned item to change your saved build.",
        )}
      </p>
    </section>
  );
}

function GearDetails({
  profile,
  candidate,
  offer,
  owned,
  character,
  busy,
  onBuy,
  onEquip,
  onUnequip,
  onSell,
  onForge,
  onInspectOwned,
}: {
  profile: Progress;
  candidate: EquipmentInstance;
  offer?: ShopOffer;
  owned: boolean;
  character: CharacterId;
  busy: boolean;
  onInspectOwned?: () => void;
} & Callbacks) {
  const { t, text } = useI18n(),
    def = ITEMS[candidate.definitionId];
  const current = profile.rpg!.equipment.find(
    (item) => item.id === profile.rpg!.equipped[def.slot!],
  );
  const equipped = current?.id === candidate.id;
  const before = calculateStats(profile, undefined, character),
    after = calculateStats(
      previewEquipment(profile, candidate),
      undefined,
      character,
    );
  const entry = inventory(profile).find((e) => e.id === candidate.id);
  const price = entry ? sellPrice(entry) : 0;
  const protectedItem = equipped || candidate.locked || candidate.favorite;
  const blocked = offer ? purchaseEligibility(profile, offer) : null;
  const gate = offer?.requiredClear
    ? WORLDS.find((world) => offer.requiredClear!.startsWith(world.id + "-"))
    : null;
  return (
    <section
      className="outfitters-detail"
      aria-label={t("outfitters", "Candidate")}
      data-selected-item={candidate.definitionId}
    >
      <div
        className="outfitters-detail-title"
        style={
          {
            "--item-color": RARITIES[candidate.rarity].color,
          } as React.CSSProperties
        }
      >
        <ItemIcon id={candidate.definitionId} size={64} />
        <span className="eyebrow">
          {text(RARITIES[candidate.rarity].name)} ·{" "}
          {t("outfitters", "Item level")} {candidate.level}
        </span>
        <h2>
          {text(def.name)} <small>+{candidate.enhancement}</small>
        </h2>
      </div>
      <div className="outfitters-current">
        <small>{t("outfitters", "Currently equipped")}</small>
        <strong>
          {current
            ? `${text(ITEMS[current.definitionId].name)} +${current.enhancement}`
            : text("Empty")}
        </strong>
      </div>
      <h3>{t("outfitters", "Item bonuses")}</h3>
      <dl className="outfitters-bonuses">
        {Object.entries(itemStats(candidate))
          .filter(([, v]) => v > 0)
          .map(([key, value]) => (
            <div key={key}>
              <dt>{text(statNames[key as StatKey])}</dt>
              <dd>+{formatEquipmentStat(key as StatKey, value)}</dd>
            </div>
          ))}
      </dl>
      <h3>{t("outfitters", "Build comparison")}</h3>
      <table className="outfitters-comparison">
        <thead>
          <tr>
            <th>{t("outfitters", "Stat")}</th>
            <th>{t("outfitters", "Before")}</th>
            <th>{t("outfitters", "After")}</th>
            <th>{t("outfitters", "Change")}</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(statNames) as StatKey[])
            .filter((key) => before[key] !== 0 || after[key] !== 0)
            .map((key) => {
              const delta =
                Math.abs(after[key] - before[key]) < 1e-9
                  ? 0
                  : after[key] - before[key];
              return (
                <tr key={key} data-stat={key}>
                  <th>{text(statNames[key])}</th>
                  <td>{formatEquipmentStat(key, before[key])}</td>
                  <td>{formatEquipmentStat(key, after[key])}</td>
                  <td
                    className={
                      delta > 0 ? "positive" : delta < 0 ? "negative" : ""
                    }
                  >
                    {delta === 0 ? (
                      <span aria-label={t("outfitters", "No change")}>—</span>
                    ) : (
                      `${delta > 0 ? "+" : ""}${formatEquipmentStat(key, delta)}`
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {blocked && (
        <p className="outfitters-eligibility" role="status">
          {text(blocked)}
          {gate && (
            <small>
              {t(
                "outfitters",
                "Defeat {boss} on Normal to unlock this offer.",
                { boss: text(gate.boss.name) },
              )}
            </small>
          )}
        </p>
      )}
      <div className="outfitters-actions">
        {offer ? (
          <>
            <button
              className="rpg-primary"
              disabled={busy || !!blocked}
              onClick={() => onBuy(offer)}
            >
              {t("outfitters", "Buy for {gold} gold", { gold: offer.price })}
            </button>
            {onInspectOwned && (
              <button className="rpg-button" onClick={onInspectOwned}>
                {t("outfitters", "Inspect owned copy")}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className="rpg-primary"
              disabled={
                busy ||
                (equipped && usedSlots(profile) >= profile.rpg!.capacity)
              }
              onClick={() =>
                equipped ? onUnequip(def.slot!) : onEquip(candidate.id)
              }
            >
              {t(
                "outfitters",
                equipped ? "Unequip this item" : "Equip this item",
              )}
            </button>
            <button
              className="rpg-button"
              disabled={busy}
              onClick={() => onForge(candidate.id)}
            >
              {t("outfitters", "Enhance at the forge")}
            </button>
            {owned && (
              <button
                className="rpg-button"
                disabled={busy || protectedItem}
                onClick={() => onSell(candidate)}
              >
                {t("outfitters", "Sell for {gold} gold", { gold: price })}
              </button>
            )}
            {protectedItem && (
              <small>
                {t(
                  "outfitters",
                  "Unequip and remove protection before selling.",
                )}
              </small>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function RiftOutfitters({
  profile,
  character,
  busy,
  ...callbacks
}: { profile: Progress; character: CharacterId; busy: boolean } & Callbacks) {
  const { t, text } = useI18n();
  const [category, setCategory] = useState<Category>("armor"),
    [collection, setCollection] = useState("forest"),
    [rarity, setRarity] = useState("all"),
    [mode, setMode] = useState<"stock" | "owned">("stock"),
    [selection, setSelection] = useState("outfitters-forest-armor-common"),
    [mobileOpen, setMobileOpen] = useState(false);
  const offers = OUTFITTER_OFFERS.filter(
    (o) =>
      ITEMS[o.item].slot === category &&
      (collection === "all" || o.item.startsWith(collection + "-")) &&
      (rarity === "all" || o.rarity === rarity),
  );
  const owned = profile.rpg!.equipment.filter(
    (item) =>
      ITEMS[item.definitionId].slot === category &&
      (collection === "all" ||
        item.definitionId.startsWith(collection + "-")) &&
      (rarity === "all" || item.rarity === rarity),
  );
  const offer =
    mode === "stock"
      ? (offers.find((o) => o.id === selection) ?? offers[0])
      : undefined;
  const candidate = offer
    ? shopEquipment(offer.id, "outfitters-preview")
    : (owned.find((item) => item.id === selection) ?? owned[0]);
  const preview = candidate ? previewEquipment(profile, candidate) : profile;
  const matching = offer
    ? profile
        .rpg!.equipment.filter(
          (item) =>
            item.definitionId === offer.item &&
            item.rarity === offer.rarity &&
            item.level === offer.level,
        )
        .at(-1)
    : undefined;
  function inspect(id: string) {
    setSelection(id);
    if (matchMedia("(max-width:900px)").matches) setMobileOpen(true);
  }
  const appearance = (
    <EquipmentDoll
      profile={preview}
      character={character}
      category={category}
      preview={!!candidate}
      onCategory={setCategory}
    />
  );
  const detail = candidate ? (
    <GearDetails
      profile={profile}
      candidate={candidate}
      offer={offer}
      owned={mode === "owned"}
      character={character}
      busy={busy}
      {...callbacks}
      onInspectOwned={
        matching
          ? () => {
              setMode("owned");
              setSelection(matching.id);
            }
          : undefined
      }
    />
  ) : (
    <p>{t("outfitters", "Choose gear to compare its real bonuses.")}</p>
  );
  return (
    <section
      className="outfitters"
      aria-label={t("outfitters", "Rift Outfitters")}
    >
      <header className="outfitters-heading">
        <div>
          <span className="eyebrow">{t("outfitters", "ARMOR & CLOTHING")}</span>
          <h1>{t("outfitters", "RIFT OUTFITTERS")}</h1>
          <p>{t("outfitters", "Made for the road ahead.")}</p>
        </div>
        <dl>
          <div>
            <dt>{t("outfitters", "Gold balance")}</dt>
            <dd data-testid="outfitters-gold">{profile.gold}</dd>
          </div>
          <div>
            <dt>{t("outfitters", "Bag capacity")}</dt>
            <dd>
              {usedSlots(profile)} / {profile.rpg!.capacity}
            </dd>
          </div>
        </dl>
      </header>
      <p className="outfitters-dialogue">
        <strong>{t("outfitters", "Talia · Outfitter")}</strong>
        {t(
          "outfitters",
          "Try a new fit. Your gold stays yours until you confirm a purchase.",
        )}
      </p>
      <div className="outfitters-layout">
        <section className="outfitters-catalog">
          <div className="outfitters-modes">
            {(["stock", "owned"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {t(
                  "outfitters",
                  value === "stock" ? "Shop stock" : "Owned gear",
                )}
              </button>
            ))}
          </div>
          <div
            className="outfitters-categories"
            role="group"
            aria-label={t("outfitters", "Equipment category")}
          >
            {WEARABLE_SLOTS.map((slot) => (
              <button
                key={slot}
                aria-pressed={category === slot}
                onClick={() => setCategory(slot)}
              >
                {t("outfitters", labels[slot])}
              </button>
            ))}
          </div>
          <div className="outfitters-filters">
            <label>
              {t("outfitters", "Collection")}
              <select
                aria-label={t("outfitters", "Collection")}
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              >
                <option value="all">
                  {t("outfitters", "All collections")}
                </option>
                {["forest", "desert", "frozen", "infernal"].map((world, i) => (
                  <option key={world} value={world}>
                    {t(
                      "outfitters",
                      (["Forest", "Desert", "Frozen", "Infernal"] as const)[i],
                    )}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("outfitters", "Quality")}
              <select
                aria-label={t("outfitters", "Quality")}
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
              >
                <option value="all">{t("outfitters", "All rarities")}</option>
                {RARITY_IDS.map((id) => (
                  <option key={id} value={id}>
                    {text(RARITIES[id].name)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="outfitters-list">
            {(mode === "stock" ? offers : owned).map((entry) => {
              const shop = "item" in entry,
                id = shop ? entry.item : entry.definitionId,
                quality = entry.rarity!,
                level = entry.level!,
                key = entry.id,
                locked =
                  shop &&
                  !!entry.requiredClear &&
                  !profile.clears.includes(entry.requiredClear);
              return (
                <button
                  key={key}
                  className="outfitters-card"
                  data-offer-id={shop ? key : undefined}
                  data-owned-id={shop ? undefined : key}
                  aria-pressed={
                    offer ? offer.id === key : candidate?.id === key
                  }
                  onClick={() => inspect(key)}
                  style={
                    {
                      "--item-color": RARITIES[quality].color,
                    } as React.CSSProperties
                  }
                >
                  <ItemIcon id={id} size={48} />
                  <strong>{text(ITEMS[id].name)}</strong>
                  <small>
                    {text(RARITIES[quality].name)} ·{" "}
                    {t("outfitters", "Item level")} {level}
                  </small>
                  {shop ? (
                    <b>
                      {entry.price} {text("Gold")}
                    </b>
                  ) : (
                    <b>
                      +{entry.enhancement}
                      {profile.rpg!.equipped[category] === key
                        ? ` · ${text("EQUIPPED")}`
                        : ""}
                    </b>
                  )}
                  {locked && <small>{t("outfitters", "Locked offer")}</small>}
                </button>
              );
            })}
          </div>
          {(mode === "stock" ? offers : owned).length === 0 && (
            <p>
              {t("outfitters", "No matching clothing yet.")}
              <button
                className="rpg-button"
                onClick={() => {
                  setMode("stock");
                  setCollection("forest");
                  setRarity("all");
                }}
              >
                {t("outfitters", "Browse shop stock")}
              </button>
            </p>
          )}
          <button
            className="outfitters-mobile-inspect rpg-button"
            disabled={!candidate}
            onClick={() => setMobileOpen(true)}
          >
            {t("outfitters", "Inspect selected gear")}
          </button>
        </section>
        <div className="outfitters-desktop-appearance">{appearance}</div>
        <div className="outfitters-desktop-detail">{detail}</div>
      </div>
      <p className="outfitters-footnote">
        {t("outfitters", "Seven slots. One shared inventory.")}
      </p>
      {mobileOpen && (
        <div className="outfitters-mobile-modal">
          <Modal
            title={t("outfitters", "Inspect selected gear")}
            onClose={() => setMobileOpen(false)}
          >
            {appearance}
            {detail}
          </Modal>
        </div>
      )}
    </section>
  );
}
