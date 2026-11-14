"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { QUEST_CATALOG } from "@/game/quests/catalog";
import type { QuestJournal } from "@/game/quests/types";
export default function QuestNotice({ journal }: { journal: QuestJournal }) {
  const { locale, text } = useI18n(),
    seen = useRef(journal.sequence),
    [notice, setNotice] = useState<{ questId: string; kind: string } | null>(
      null,
    );
  useEffect(() => {
    if (journal.sequence <= seen.current) return;
    seen.current = journal.sequence;
    const n = journal.notices.at(-1),
      d = QUEST_CATALOG.find((d) => d.id === n?.questId);
    if (!n || !d) return;
    setNotice({
      questId: d.id,
      kind:
        n.kind === "objective"
          ? "OBJECTIVE COMPLETED"
          : n.kind === "accepted"
            ? "Quest accepted"
            : n.kind === "ready"
              ? "Reward ready"
              : "QUEST UPDATED",
    });
  }, [journal.sequence]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3400);
    return () => clearTimeout(timer);
  }, [notice]);
  return notice ? (
    <aside className="quest-notice" role="status">
      <small>{text(notice.kind)}</small>
      <strong>
        {QUEST_CATALOG.find((d) => d.id === notice.questId)!.title[locale]}
      </strong>
    </aside>
  ) : null;
}
