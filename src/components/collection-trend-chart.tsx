"use client";

import { Fragment, useState } from "react";
import styles from "./console.module.css";

type Day = { date: string; positive: number; negative: number };
type SeriesKey = "total" | "positive" | "negative";

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "total", label: "전체", color: "#3c82f6" },
  { key: "positive", label: "양성(의심)", color: "#ee4765" },
  { key: "negative", label: "음성(정상)", color: "#0aaa75" },
];

function seriesValue(day: Day, key: SeriesKey) {
  return key === "total" ? day.positive + day.negative : day[key];
}

/** 점들을 Catmull-Rom 기반 베지어 곡선으로 잇는다. 제어점 y는 차트 범위로 눌러 과도한 출렁임을 막는다. */
function smoothPath(points: { x: number; y: number }[]) {
  const clampY = (y: number) => Math.min(100, Math.max(0, y));
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const prev = points[i - 1] ?? points[i];
    const from = points[i];
    const to = points[i + 1];
    const next = points[i + 2] ?? to;
    const c1x = from.x + (to.x - prev.x) / 6;
    const c1y = clampY(from.y + (to.y - prev.y) / 6);
    const c2x = to.x - (next.x - from.x) / 6;
    const c2y = clampY(to.y - (next.y - from.y) / 6);
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }
  return d;
}

/**
 * 전체·양성·음성 세 추이를 한 차트에 겹쳐 그린다.
 * 범례 버튼으로 시리즈를 켜고 끌 수 있으며 최소 1개는 항상 켜져 있다.
 * 숫자 라벨은 선이 겹치면 읽기 어려워 1개만 켰을 때 표시한다.
 */
export default function CollectionTrendChart({ trend }: { trend: Day[] }) {
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    total: true,
    positive: true,
    negative: true,
  });
  const activeSeries = SERIES.filter((series) => active[series.key]);
  const single = activeSeries.length === 1;

  function toggle(key: SeriesKey) {
    setActive((current) => {
      const next = { ...current, [key]: !current[key] };
      // 최소 1개는 켜져 있어야 한다.
      return next.total || next.positive || next.negative ? next : current;
    });
  }

  const max = Math.max(
    1,
    ...trend.flatMap((day) => activeSeries.map((series) => seriesValue(day, series.key))),
  );
  const xPct = (index: number) => (trend.length === 1 ? 50 : (index * 100) / (trend.length - 1));
  const yPct = (count: number) => 100 - (count / max) * 100;

  return (
    <>
      <div className={styles.trendToggles} role="group" aria-label="표시할 추이 선택">
        {SERIES.map((series) => (
          <button
            key={series.key}
            type="button"
            aria-pressed={active[series.key]}
            onClick={() => toggle(series.key)}
          >
            <i style={{ background: series.color }} aria-hidden="true" />
            {series.label}
          </button>
        ))}
      </div>

      <div className={styles.chartArea}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            {SERIES.map((series) => (
              <linearGradient key={series.key} id={`trend-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={series.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>
          {trend.length > 1 && activeSeries.map((series) => {
            const points = trend.map((day, index) => ({ x: xPct(index), y: yPct(seriesValue(day, series.key)) }));
            const line = smoothPath(points);
            return (
              <Fragment key={series.key}>
                {/* 면 채우기는 1개만 켰을 때(겹침 없음)만 그린다 */}
                {single && (
                  <path
                    d={`${line} L ${points[points.length - 1].x.toFixed(2)} 100 L ${points[0].x.toFixed(2)} 100 Z`}
                    fill={`url(#trend-${series.key})`}
                  />
                )}
                <path
                  d={line}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </Fragment>
            );
          })}
        </svg>
        {activeSeries.map((series) =>
          trend.map((day, index) => (
            <i
              key={`${series.key}-${day.date}`}
              className={styles.trendDot}
              style={{ left: `${xPct(index)}%`, top: `${yPct(seriesValue(day, series.key))}%`, borderColor: series.color }}
            />
          )),
        )}
        {/* 상시 숫자 라벨은 낮은 값 구간에서 겹쳐 읽기 어려워, 날짜 열 호버 시 툴팁으로 보여준다 */}
        {trend.map((day, index) => {
          // 툴팁은 그 날짜에서 가장 높은 점(최댓값) 바로 위에 띄운다.
          // hoverCol은 chartArea(150px)보다 위로 12px 길어서 그만큼 보정한다.
          const topY = Math.min(...activeSeries.map((series) => yPct(seriesValue(day, series.key))));
          const tipTop = 12 + topY * 1.5 - 10;
          return (
          <div
            key={day.date}
            className={styles.hoverCol}
            style={{ left: `${xPct(index)}%` }}
            data-edge={index === 0 ? "start" : index === trend.length - 1 ? "end" : undefined}
          >
            <div className={styles.chartTip} role="status" style={{ top: `${tipTop}px` }}>
              <strong>{day.date.slice(5)}</strong>
              {activeSeries.map((series) => (
                <span key={series.key}>
                  <i style={{ background: series.color }} aria-hidden="true" />
                  {series.label} {seriesValue(day, series.key)}건
                </span>
              ))}
            </div>
          </div>
          );
        })}
      </div>
      <div className={styles.trendDates}>
        {trend.map((day, index) => (
          <span key={day.date} style={{ left: `${xPct(index)}%` }}>{day.date.slice(5)}</span>
        ))}
      </div>
    </>
  );
}
