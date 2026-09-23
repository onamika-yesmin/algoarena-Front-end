"use client";

import { useId, useMemo, useState } from "react";
import type { ActivityEntry, AnalyticsHistoryEntry } from "@/lib/api/analytics";
import styles from "./analytics.module.css";

/* Palette — see the header comment in analytics.module.css for why these
   exact values (all validated against the #171c34 panel in dark mode). */
export const SERIES = "#8067ff";
export const STATUS = { good: "#65dfad", warn: "#ffc861", bad: "#f2545b", info: "#8fc3ff" };
/** Magnitude ramp for the activity calendar: one hue, light → dark. */
const ACTIVITY_RAMP = ["#1d5b60", "#23787c", "#31a5a4", "#55d8d2"];
const ACTIVITY_EMPTY = "#1a2038";

const UTC_DAY = { timeZone: "UTC" } as const;

/** "YYYY-MM-DD" parses as UTC midnight, so format in UTC too — otherwise
 *  anyone west of UTC sees the previous day. */
export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(iso).toLocaleDateString(undefined, { ...opts, ...UTC_DAY });
}

/* ------------------------------------------------------------ stat tile */

export interface TileProps {
  label: string;
  value: string;
  /** Change over the window, already worded (e.g. "+4 in 30 days"). */
  delta?: { text: string; direction: "up" | "flat" };
  /** Plotted in the de-emphasised hue behind the value. */
  trend?: number[];
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 200;
  const height = 30;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => `${index === 0 ? "M" : "L"}${(index * step).toFixed(1)},${(height - ((value - min) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");

  return (
    <svg className={styles.tileSpark} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={SERIES} strokeOpacity="0.55" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function StatTile({ label, value, delta, trend }: TileProps) {
  return (
    <article className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      {delta && (
        <span className={`${styles.tileDelta} ${delta.direction === "up" ? styles.tileDeltaUp : styles.tileDeltaFlat}`}>
          {delta.text}
        </span>
      )}
      {trend && <Sparkline points={trend} />}
    </article>
  );
}

/* ------------------------------------------------------------ bar list */

export interface BarRow {
  key: string;
  label: string;
  count: number;
  /** Status colour, when the category genuinely means a state. Omitted for
   *  nominal categories, which all share the single series hue — bar length
   *  already encodes the value, so colour would only repeat it. */
  color?: string;
}

export function BarBreakdown({ rows, totalForPercent }: { rows: BarRow[]; totalForPercent?: number }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0) || 1;
  const total = totalForPercent ?? rows.reduce((acc, row) => acc + row.count, 0);

  return (
    <div className={styles.barList}>
      {rows.map((row, index) => {
        const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <div
            className={styles.barRow}
            key={row.key}
            title={`${row.label}: ${row.count}${total > 0 ? ` (${percent}%)` : ""}`}
          >
            <span className={styles.barTop}>
              {row.color && <span className={styles.barDot} style={{ background: row.color }} aria-hidden="true" />}
              <span className={styles.barLabel}>{row.label}</span>
              <span className={styles.barValue}>
                {row.count}
                {total > 0 && <small>{percent}%</small>}
              </span>
            </span>
            <span className={styles.barTrack}>
              <span
                className={styles.barFill}
                style={{
                  width: `${Math.max((row.count / max) * 100, 2)}%`,
                  background: row.color ?? SERIES,
                  animationDelay: `${index * 70}ms`,
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------- activity calendar */

/** Buckets a day's count into one of the four ramp steps. */
function rampStep(count: number, max: number) {
  if (count <= 0) return ACTIVITY_EMPTY;
  const index = Math.min(ACTIVITY_RAMP.length - 1, Math.floor(((count - 1) / Math.max(max, 1)) * ACTIVITY_RAMP.length));
  return ACTIVITY_RAMP[index];
}

/**
 * One square per day, oldest → newest, sized to fill the panel. A
 * weekday-aligned calendar was tried first, but 30 days is only ~5 columns
 * — it read as a stranded little block in a full-width panel, and with so
 * short a window the "which weekday do I code on" pattern isn't there to
 * find anyway.
 */
export function ActivityCalendar({ activity }: { activity: ActivityEntry[] }) {
  const max = activity.reduce((acc, day) => Math.max(acc, day.count), 0) || 1;
  const busiest = activity.reduce<ActivityEntry | null>(
    (best, day) => (day.count > (best?.count ?? 0) ? day : best),
    null,
  );
  const activeDays = activity.filter((day) => day.count > 0).length;

  return (
    <div>
      <div className={styles.stripScroll}>
        <div className={styles.activityStrip} style={{ gridTemplateColumns: `repeat(${activity.length}, minmax(0, 1fr))` }}>
          {activity.map((day) => (
            <span
              key={day.date}
              className={styles.activityCell}
              style={{ background: rampStep(day.count, max) }}
              title={`${formatDay(day.date, { weekday: "short", month: "short", day: "numeric" })} — ${day.count} submission${day.count === 1 ? "" : "s"}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.activityAxis}>
        <span>{activity.length > 0 ? formatDay(activity[0].date) : ""}</span>
        <span>{activity.length > 0 ? formatDay(activity[activity.length - 1].date) : ""}</span>
      </div>

      <div className={styles.calFooter}>
        <p className={styles.calSummary}>
          Active on <b>{activeDays}</b> of the last {activity.length} days
          {busiest && busiest.count > 0 && (
            <>
              {" · busiest was "}
              <b>{formatDay(busiest.date)}</b> with {busiest.count}
            </>
          )}
        </p>
        <div className={styles.calLegend}>
          Less
          <i style={{ background: ACTIVITY_EMPTY }} />
          {ACTIVITY_RAMP.map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------- trend chart */

export type TrendMetric = "problemsSolved" | "accuracyPercent" | "currentStreakDays";

const METRIC_META: Record<TrendMetric, { label: string; suffix: string; short: string }> = {
  problemsSolved: { label: "Problems solved", suffix: "", short: "solved" },
  accuracyPercent: { label: "Accuracy", suffix: "%", short: "accuracy" },
  currentStreakDays: { label: "Streak", suffix: "", short: "day streak" },
};

const W = 720;
const H = 230;
const PAD = { top: 16, right: 16, bottom: 30, left: 40 };

export function TrendChart({ history, metric }: { history: AnalyticsHistoryEntry[]; metric: TrendMetric }) {
  const clipId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const meta = METRIC_META[metric];

  const model = useMemo(() => {
    if (history.length < 2) return null;
    const values = history.map((entry) => entry[metric]);
    const times = history.map((entry) => new Date(entry.date).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const tSpan = tMax - tMin || 1;

    // Round the top of the scale up to a clean, EVEN number so the midpoint
    // tick is a whole number too — otherwise the gridline sits at 4.5 while
    // its label reads "5", which is just a lie about where the line is.
    const rawMax = Math.max(...values, 1);
    const exponent = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const fraction = rawMax / exponent;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 4 ? 4 : fraction <= 6 ? 6 : fraction <= 8 ? 8 : 10;
    const yMax = metric === "accuracyPercent" ? 100 : nice * exponent;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const points = history.map((entry, index) => ({
      x: PAD.left + ((times[index] - tMin) / tSpan) * plotW,
      y: PAD.top + plotH - (values[index] / (yMax || 1)) * plotH,
      value: values[index],
      date: entry.date,
    }));

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${PAD.top + plotH} L${points[0].x.toFixed(1)},${PAD.top + plotH} Z`;
    const ticks = Number.isInteger(yMax / 2) ? [0, yMax / 2, yMax] : [0, yMax];
    return { points, line, area, yMax, ticks, plotH, plotW };
  }, [history, metric]);

  if (!model) {
    return (
      <p className={styles.emptyState}>
        Not enough history yet — a snapshot is saved each day you visit, and the chart appears once there are two.
      </p>
    );
  }

  const active = hover !== null ? model.points[hover] : null;
  const last = model.points[model.points.length - 1];

  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${meta.label} over time`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={model.plotW} height={model.plotH} />
          </clipPath>
        </defs>

        {model.ticks.map((tick) => {
          const y = PAD.top + model.plotH - (tick / (model.yMax || 1)) * model.plotH;
          return (
            <g key={tick}>
              <line className={styles.gridLine} x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
              <text className={styles.axisText} x={PAD.left - 8} y={y + 3.5} textAnchor="end">
                {Math.round(tick)}
                {meta.suffix}
              </text>
            </g>
          );
        })}

        <g clipPath={`url(#${clipId})`}>
          <path className={styles.trendArea} d={model.area} />
          <path className={styles.trendLine} d={model.line} vectorEffect="non-scaling-stroke" />
        </g>

        {active && (
          <line
            className={styles.crosshair}
            x1={active.x}
            x2={active.x}
            y1={PAD.top}
            y2={PAD.top + model.plotH}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {model.points.map((point, index) => (
          <circle
            key={point.date}
            className={styles.trendDot}
            cx={point.x}
            cy={point.y}
            r={hover === index || index === model.points.length - 1 ? 5 : 3.5}
          />
        ))}

        {/* Hit targets are far wider than the dots so hovering is forgiving. */}
        {model.points.map((point, index) => (
          <rect
            key={`hit-${point.date}`}
            className={styles.trendHit}
            x={point.x - 16}
            y={PAD.top}
            width={32}
            height={model.plotH}
            onMouseEnter={() => setHover(index)}
          />
        ))}

        {/* Only the endpoint is directly labelled — a number on every point
            is noise; the tooltip and the table carry the rest. */}
        <text className={styles.axisText} x={PAD.left} y={H - 8}>
          {formatDay(model.points[0].date)}
        </text>
        <text className={styles.axisText} x={W - PAD.right} y={H - 8} textAnchor="end">
          {formatDay(last.date)}
        </text>
      </svg>

      {active && (
        <div className={styles.tooltip} style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100 - 4}%` }}>
          <b>
            {active.value}
            {meta.suffix} {meta.short}
          </b>
          {formatDay(active.date, { weekday: "short", month: "short", day: "numeric" })}
        </div>
      )}
    </div>
  );
}

export function TrendSwitch({ metric, onChange }: { metric: TrendMetric; onChange: (next: TrendMetric) => void }) {
  return (
    <div className={styles.segmented} role="group" aria-label="Choose a metric">
      {(Object.keys(METRIC_META) as TrendMetric[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={metric === key}
          className={`${styles.segmentedButton}${metric === key ? ` ${styles.segmentedActive}` : ""}`}
          onClick={() => onChange(key)}
        >
          {METRIC_META[key].label}
        </button>
      ))}
    </div>
  );
}
