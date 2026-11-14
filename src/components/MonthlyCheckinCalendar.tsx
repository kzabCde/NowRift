"use client";
import { useEffect, useRef, useState } from "react";
import type { Checkin } from "@/game/persistence/model";
import { CHECKINS, type Gift } from "@/game/persistence/daily";
import {
  adjacentMonth,
  calendarLabel,
  calendarReward,
  checkinState,
  monthCells,
} from "@/game/persistence/calendar";
import { ITEMS } from "@/game/rpg/content";
import { useI18n } from "@/i18n/useI18n";
import ItemIcon from "./ItemIcon";

export default function MonthlyCheckinCalendar({
  today,
  claims,
  busy,
  canClaim,
  onClaim,
}: {
  today: string;
  claims: Checkin[];
  busy: boolean;
  canClaim: boolean;
  onClaim: (day: string) => void;
}) {
  const { t, text, locale } = useI18n(),
    [month, setMonth] = useState(today.slice(0, 7)),
    [selected, setSelected] = useState(today),
    previousToday = useRef(today),
    table = useRef<HTMLTableElement>(null);
  useEffect(() => {
    if (previousToday.current === today) return;
    if (month === previousToday.current.slice(0, 7)) {
      setMonth(today.slice(0, 7));
      setSelected(today);
    }
    previousToday.current = today;
  }, [today, month]);
  const cells = monthCells(month),
    claim = claims.find((c) => c.day === selected),
    state = checkinState(selected, today, claims),
    reward = calendarReward(selected),
    shownGift =
      claim?.cycle !== undefined ? CHECKINS[claim.cycle].gift : reward.gift,
    rollback = claims.some((c) => c.day > today);
  const stateLabel = (value: ReturnType<typeof checkinState>) =>
    t(
      "qol",
      {
        claimed: "Claimed",
        today: "Available today",
        missed: "Missed",
        future: "Future · locked",
      }[value],
    );
  function describe(gift: Gift) {
    return [
      gift.gold ? `${gift.gold.toLocaleString(locale)} ${text("Gold")}` : "",
      ...Object.entries(gift.materials ?? {}).map(
        ([id, n]) => `${text(ITEMS[id].name)} ×${n}`,
      ),
      gift.epic ? text("One Epic forest weapon, opened immediately") : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  function browse(offset: number) {
    const next = adjacentMonth(month, offset);
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : next + "-01");
  }
  const icon = (gift: Gift) =>
    gift.epic
      ? "forest-weapon"
      : (Object.keys(gift.materials ?? {})[0] ?? "gold-ore");
  return (
    <section className="rpg-panel monthly-checkin">
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">{text("A LIGHT TO RETURN TO")}</span>
          <h2>{t("qol", "Monthly provisions")}</h2>
        </div>
        <span className="calendar-zone">
          ASIA / BANGKOK
          <br />
          {today}
        </span>
      </div>
      <p className="calendar-intro">
        {t(
          "qol",
          "Claim today's date for the active character. Missed dates stay missed; later rewards never shift.",
        )}
      </p>
      <div className="calendar-month-nav">
        <button
          className="quiet-button"
          disabled={month === "0000-01"}
          aria-label={t("qol", "Previous month")}
          onClick={() => browse(-1)}
        >
          ‹
        </button>
        <h3 id="checkin-month" aria-live="polite">
          {calendarLabel(month, locale, true)}
        </h3>
        <button
          className="quiet-button"
          disabled={month === "9999-12"}
          aria-label={t("qol", "Next month")}
          onClick={() => browse(1)}
        >
          ›
        </button>
        <button
          className="quiet-button calendar-today"
          onClick={() => {
            setMonth(today.slice(0, 7));
            setSelected(today);
          }}
        >
          {t("qol", "Today")}
        </button>
      </div>
      <div className="calendar-layout">
        <table
          ref={table}
          className="calendar-table"
          aria-labelledby="checkin-month"
          data-calendar-month={month}
        >
          <thead>
            <tr>
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((day, i) => (
                <th key={day} scope="col">
                  <abbr title={t("qol", day)}>
                    {new Intl.DateTimeFormat(
                      locale === "th" ? "th-TH" : "en-GB",
                      { weekday: "short", timeZone: "UTC" },
                    ).format(Date.UTC(2026, 10, 1 + i))}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                  if (!day)
                    return (
                      <td
                        key={col}
                        className="calendar-blank"
                        aria-hidden="true"
                      />
                    );
                  const cellState = checkinState(day, today, claims),
                    r = calendarReward(day),
                    historic = claims.find((c) => c.day === day),
                    gift =
                      historic?.cycle !== undefined
                        ? CHECKINS[historic.cycle].gift
                        : r.gift;
                  return (
                    <td key={day}>
                      <button
                        type="button"
                        data-calendar-date={day}
                        data-state={cellState}
                        className={`calendar-date ${cellState} ${r.weekly ? "milestone" : ""} ${r.final ? "final-day" : ""}`}
                        aria-label={`${calendarLabel(day, locale)} · ${stateLabel(cellState)} · ${describe(gift)}`}
                        aria-pressed={selected === day}
                        aria-current={day === today ? "date" : undefined}
                        tabIndex={selected === day ? 0 : -1}
                        onClick={() => setSelected(day)}
                        onKeyDown={(e) => {
                          const move: Record<string, number> = {
                              ArrowLeft: -1,
                              ArrowRight: 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                            },
                            index = cells.indexOf(day);
                          if (e.key in move) {
                            e.preventDefault();
                            const next = cells[index + move[e.key]];
                            if (next) {
                              setSelected(next);
                              table.current
                                ?.querySelector<HTMLButtonElement>(
                                  `[data-calendar-date="${next}"]`,
                                )
                                ?.focus();
                            }
                          }
                        }}
                      >
                        <span className="calendar-day-number">
                          {Number(day.slice(8))}
                        </span>
                        <ItemIcon id={icon(gift)} size={32} />
                        <small className="calendar-reward-amount">
                          {gift.gold
                            ? gift.gold.toLocaleString(locale)
                            : `×${Object.values(gift.materials ?? {})[0]}`}
                        </small>
                        <span
                          className="calendar-state-symbol"
                          aria-hidden="true"
                        >
                          {cellState === "claimed"
                            ? "✓"
                            : cellState === "missed"
                              ? "·"
                              : cellState === "future"
                                ? "◇"
                                : "✦"}
                        </span>
                        {(r.weekly || r.final) && (
                          <span
                            className="calendar-milestone"
                            aria-hidden="true"
                          >
                            {r.final ? "✦" : "◆"}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <aside className="calendar-detail" aria-live="polite">
          <span className="eyebrow">{stateLabel(state)}</span>
          <h3>{calendarLabel(selected, locale)}</h3>
          <ItemIcon id={icon(shownGift)} size={52} />
          <p>{describe(shownGift)}</p>
          {claim?.cycle !== undefined ? (
            <small>
              {t("qol", "Legacy seven-day reward · day {day}", {
                day: claim.cycle + 1,
              })}
            </small>
          ) : (
            <small>
              {[
                reward.weekly ? t("qol", "Weekly milestone") : "",
                reward.final ? t("qol", "Final calendar-day bonus") : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
          )}
          <button
            className="rpg-primary"
            disabled={busy || !canClaim || rollback || state !== "today"}
            onClick={() => onClaim(selected)}
          >
            {text(
              state === "claimed"
                ? selected === today
                  ? "CLAIMED TODAY"
                  : "Claimed"
                : state === "today"
                  ? "CLAIM DAILY REWARD"
                  : "Date locked",
            )}
          </button>
          <small>
            {t(
              "qol",
              "One reward per local player each real date, across all save slots.",
            )}
          </small>
        </aside>
      </div>
      <div className="calendar-legend">
        {["Claimed", "Available today", "Missed", "Future · locked"].map(
          (label, i) => (
            <span key={label}>
              <i data-state={["claimed", "today", "missed", "future"][i]} />
              {t("qol", label)}
            </span>
          ),
        )}
      </div>
      <p className="profile-footer-note">
        {text(
          "Resets at midnight Asia/Bangkok. An offline device clock can be changed; this is not server-grade anti-cheat.",
        )}
      </p>
      {rollback && (
        <p className="notice negative" role="alert">
          {text(
            "The device clock is earlier than your last check-in. Correct the clock before claiming.",
          )}
        </p>
      )}
      <details className="calendar-history">
        <summary>{t("qol", "This month's claim history")}</summary>
        {claims.filter((c) => c.day.startsWith(month)).length ? (
          claims
            .filter((c) => c.day.startsWith(month))
            .toSorted((a, b) => b.day.localeCompare(a.day))
            .map((c) => (
              <p key={c.day}>
                {calendarLabel(c.day, locale)} ·{" "}
                {c.cycle === undefined
                  ? t("qol", "Calendar reward")
                  : t("qol", "Legacy seven-day reward · day {day}", {
                      day: c.cycle + 1,
                    })}
              </p>
            ))
        ) : (
          <p>{t("qol", "No claims in this month.")}</p>
        )}
      </details>
    </section>
  );
}
