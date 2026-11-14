"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { QUEST_CATALOG } from "@/game/quests/catalog";
import { currentObjectives } from "@/game/quests/engine";
import type { QuestCommand } from "@/game/quests/commands";
import type {
  QuestDefinition,
  QuestJournal as Journal,
} from "@/game/quests/types";
import { WORLDS, STAGES } from "@/game/campaign/content";
import { ITEMS } from "@/game/rpg/content";
import { LANDMARKS } from "@/game/world/content";

const statusLabels = {
  LOCKED: "Locked",
  AVAILABLE: "Available",
  ACTIVE: "Active",
  OBJECTIVE_COMPLETED: "Quest updated",
  READY_TO_CLAIM: "Reward ready",
  COMPLETED: "Completed",
  FAILED: "Failed",
} as const;
type Action = (command: {
  type: "accept" | "claim" | "deliver";
  questId: string;
  objectiveId?: string;
}) => void;

export function QuestCard({
  definition: d,
  journal,
  busy = false,
  atGiver = false,
  onAction,
  onTrack,
  compact = false,
}: {
  definition: QuestDefinition;
  journal: Journal;
  busy?: boolean;
  atGiver?: boolean;
  onAction?: Action;
  onTrack?: (id: string | null) => void;
  compact?: boolean;
}) {
  const { locale, text } = useI18n(),
    q = journal.quests[d.id];
  const active = ["ACTIVE", "OBJECTIVE_COMPLETED", "READY_TO_CLAIM"].includes(
    q.status,
  );
  return (
    <article
      className={`quest-card quest-${q.status.toLowerCase()}`}
      data-quest-id={d.id}
    >
      <div className="quest-card-heading">
        <small>
          {text(WORLDS.find((w) => w.id === d.chapterId)!.name)} ·{" "}
          {text(
            {
              main: "Main Story",
              side: "Side Quests",
              guild: "Guild Contracts",
              npc: "NPC chain",
            }[d.category],
          )}
        </small>
        <span>{text(statusLabels[q.status])}</span>
      </div>
      <h3>{d.title[locale]}</h3>
      <small className="quest-mode">
        {text(
          d.allowedModes.includes("free")
            ? "Story + Free Mode"
            : d.allowedModes.includes("story")
              ? "Story Mode objectives"
              : "Haven activities",
        )}
      </small>
      <p>
        {
          (atGiver
            ? d.dialogue[
                q.status === "READY_TO_CLAIM"
                  ? "ready"
                  : q.status === "AVAILABLE"
                    ? "offer"
                    : q.status === "COMPLETED"
                      ? "complete"
                      : "progress"
              ]
            : d.description)[locale]
        }
      </p>
      {(!compact || active) && (
        <ol className="quest-objectives">
          {d.objectives.map((o) => (
            <li
              key={o.id}
              className={
                (q.progress[o.id] ?? 0) >= o.count ? "is-complete" : ""
              }
            >
              <span>{o.text[locale]}</span>
              <strong>
                {q.progress[o.id] ?? 0}/{o.count}
              </strong>
            </li>
          ))}
        </ol>
      )}
      <small className="quest-rewards">
        {d.reward.xp} XP · {d.reward.gold} {text("Gold")}
        {Object.entries(d.reward.materials).map(([id, n]) => (
          <span key={id}>
            {" "}
            · {text(ITEMS[id].name)} ×{n}
          </span>
        ))}
        {d.reward.equipment && (
          <span> · {text(ITEMS[d.reward.equipment.definitionId].name)}</span>
        )}
      </small>
      <div className="quest-actions">
        {active && onTrack && (
          <button
            className="quiet-button"
            disabled={busy}
            onClick={() => onTrack(journal.tracked === d.id ? null : d.id)}
          >
            {text(journal.tracked === d.id ? "Stop tracking" : "Track quest")}
          </button>
        )}
        {atGiver && onAction && q.status === "AVAILABLE" && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => onAction({ type: "accept", questId: d.id })}
          >
            {text("Accept quest")}
          </button>
        )}
        {atGiver && onAction && q.status === "READY_TO_CLAIM" && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => onAction({ type: "claim", questId: d.id })}
          >
            {text("Claim reward")}
          </button>
        )}
        {atGiver &&
          onAction &&
          active &&
          currentObjectives(q, d)
            .filter((o) => o.type === "DeliverItem")
            .map((o) => (
              <button
                key={o.id}
                className="primary-button"
                disabled={busy}
                onClick={() =>
                  onAction({
                    type: "deliver",
                    questId: d.id,
                    objectiveId: o.id,
                  })
                }
              >
                {text("Deliver items")} · {text(ITEMS[o.target].name)} ×
                {o.count - (q.progress[o.id] ?? 0)}
              </button>
            ))}
      </div>
      {q.status === "LOCKED" && (
        <p className="quest-unlock">
          {text("Unlock requirement")}:{" "}
          {d.prerequisites
            .map((id) => QUEST_CATALOG.find((q) => q.id === id)!.title[locale])
            .join(" · ")}
          {d.prerequisites.length && d.requiredClear ? " · " : ""}
          {d.requiredClear
            ? `${text("Complete Story stage")}: ${text(STAGES.find((s) => s.id === d.requiredClear?.split(":")[0])?.name ?? d.requiredClear)}`
            : !d.prerequisites.length
              ? text("Complete the previous chapter")
              : ""}
        </p>
      )}
      {!atGiver && !["COMPLETED", "LOCKED"].includes(q.status) && (
        <small>
          {text("Quest giver")}:{" "}
          {text(LANDMARKS.find((l) => l.id === d.giver)?.name ?? d.giver)} ·{" "}
          {text("Visit the quest giver to accept, deliver or claim rewards.")}
        </small>
      )}
    </article>
  );
}
export default function QuestJournal({
  journal,
  busy,
  onCommand,
  onClose,
}: {
  journal: Journal;
  busy: boolean;
  onCommand: (command: QuestCommand) => void;
  onClose?: () => void;
}) {
  const { text } = useI18n(),
    [tab, setTab] = useState("main");
  const tabs = [
    ["main", "Main Story"],
    ["side", "Side Quests"],
    ["guild", "Guild Contracts"],
    ["completed", "Completed"],
  ];
  const quests = QUEST_CATALOG.filter((d) =>
    tab === "completed"
      ? journal.quests[d.id].status === "COMPLETED"
      : journal.quests[d.id].status !== "COMPLETED" &&
        (tab === "side"
          ? ["side", "npc"].includes(d.category)
          : d.category === tab),
  );
  const priority = {
    READY_TO_CLAIM: 0,
    OBJECTIVE_COMPLETED: 1,
    ACTIVE: 2,
    AVAILABLE: 3,
    FAILED: 4,
    LOCKED: 5,
    COMPLETED: 6,
  };
  quests.sort(
    (a, b) =>
      priority[journal.quests[a.id].status] -
      priority[journal.quests[b.id].status],
  );
  return (
    <section className="quest-journal" aria-label={text("Quest Journal")}>
      {onClose && (
        <button
          className="journal-close"
          aria-label={text("Close journal")}
          onClick={onClose}
        >
          ×
        </button>
      )}
      <span className="eyebrow">{text("THE SHATTERED RIFT")}</span>
      <h2>{text("Quest Journal")}</h2>
      <nav className="quest-tabs" aria-label={text("Quest categories")}>
        {tabs.map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {text(label)}
          </button>
        ))}
      </nav>
      <p className="muted">
        {text(
          "Story missions advance the campaign. Free expeditions only advance contracts that allow Free Mode.",
        )}
      </p>
      {quests.length ? (
        quests.map((d) => (
          <QuestCard
            key={d.id}
            definition={d}
            journal={journal}
            busy={busy}
            onTrack={(id) => onCommand({ type: "track", questId: id })}
          />
        ))
      ) : (
        <p>{text("No quests in this category yet.")}</p>
      )}
    </section>
  );
}
export function QuestGiver({
  giver,
  journal,
  busy,
  onAction,
  onTrack,
}: {
  giver: string;
  journal: Journal;
  busy: boolean;
  onAction: Action;
  onTrack: (id: string | null) => void;
}) {
  const { text } = useI18n();
  const quests = QUEST_CATALOG.filter(
    (d) =>
      d.giver === giver &&
      !["LOCKED", "COMPLETED"].includes(journal.quests[d.id].status),
  );
  return quests.length ? (
    <section className="quest-giver" aria-label={text("Quest giver")}>
      <h2>{text("Requests & stories")}</h2>
      {quests.map((d) => (
        <QuestCard
          key={d.id}
          definition={d}
          journal={journal}
          busy={busy}
          atGiver
          onAction={onAction}
          onTrack={onTrack}
          compact
        />
      ))}
    </section>
  ) : null;
}
export function QuestTracker({
  journal,
  onOpen,
}: {
  journal: Journal;
  onOpen: () => void;
}) {
  const { locale, text } = useI18n(),
    d = QUEST_CATALOG.find((d) => d.id === journal.tracked);
  if (!d) return null;
  const q = journal.quests[d.id],
    o = currentObjectives(q, d)[0];
  return (
    <button className="quest-tracker" onClick={onOpen}>
      <strong>{d.title[locale]}</strong>
      <small>
        {o ? (
          <>
            {o.text[locale]} · {q.progress[o.id] ?? 0}/{o.count}
          </>
        ) : (
          text("Return to the quest giver")
        )}
      </small>
    </button>
  );
}
