import Link from "next/link";
import { Fragment } from "react";
import { ArrowDown, ArrowUp, BarChart3, Bell, TrendingUp, TriangleAlert } from "lucide-react";
import type { DashboardSummary } from "@/lib/detections-api";
import { STATUS_LABEL, scoreColors, type DetectionRow } from "@/lib/detections";
import styles from "./console.module.css";

// 홈 화면 미리보기(비로그인 마케팅 화면)에서 쓰는 예시 데이터
const PREVIEW_SUMMARY: DashboardSummary = {
  total: 123,
  today: 5,
  unconfirmed: 12,
  trend: [
    { date: "05-23", count: 9 },
    { date: "05-24", count: 14 },
    { date: "05-25", count: 11 },
    { date: "05-26", count: 16 },
    { date: "05-27", count: 12 },
    { date: "05-28", count: 18 },
    { date: "05-29", count: 5 },
  ],
};

const PREVIEW_RECENT: DetectionRow[] = [
  { id: "", score: 0.92, summary: "의심 키워드와 외부 연락 유도 문구가 포함된 게시글", nickname: "@sample_1", platform: "X (Twitter)", sourceUrl: "", detectedAt: "2026-05-29 02:14", status: "unreviewed", keywords: ["키워드 탐지"] },
  { id: "", score: 0.88, summary: "거래를 유도하는 표현이 발견된 게시글", nickname: "@sample_2", platform: "X (Twitter)", sourceUrl: "", detectedAt: "2026-05-29 01:50", status: "unreviewed", keywords: ["패턴 탐지"] },
  { id: "", score: 0.85, summary: "외부 메신저 채널로 연결하는 의심 게시글", nickname: "@sample_3", platform: "X (Twitter)", sourceUrl: "", detectedAt: "2026-05-28 23:31", status: "reviewing", keywords: ["외부 링크"] },
];

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
 * 최근 7일 추이 선 그래프. 선·영역만 SVG로 그리고 점·숫자·날짜는 HTML로 얹어
 * 패널 크기와 무관하게 글자가 항상 같은 크기로 보이게 한다.
 */
function TrendLineChart({ trend }: { trend: { date: string; count: number }[] }) {
  const max = Math.max(1, ...trend.map((day) => day.count));
  const xPct = (index: number) => (trend.length === 1 ? 50 : (index * 100) / (trend.length - 1));
  const yPct = (count: number) => 100 - (count / max) * 100;

  const points = trend.map((day, index) => ({ x: xPct(index), y: yPct(day.count) }));
  const line = trend.length > 1 ? smoothPath(points) : "";
  const area = trend.length > 1
    ? `${line} L ${points[points.length - 1].x.toFixed(2)} 100 L ${points[0].x.toFixed(2)} 100 Z`
    : "";

  return (
    <>
      <div className={styles.chartArea}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0aaa75" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0aaa75" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {trend.length > 1 && <path d={area} fill="url(#trendFill)" />}
          {trend.length > 1 && (
            <path
              d={line}
              fill="none"
              stroke="#0aaa75"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {trend.map((day, index) => (
          <Fragment key={day.date}>
            <i className={styles.trendDot} style={{ left: `${xPct(index)}%`, top: `${yPct(day.count)}%` }} />
            <span className={styles.trendValue} style={{ left: `${xPct(index)}%`, top: `${yPct(day.count)}%` }}>
              {day.count}
            </span>
          </Fragment>
        ))}
      </div>
      <div className={styles.trendDates}>
        {trend.map((day, index) => (
          <span key={day.date} style={{ left: `${xPct(index)}%` }}>{day.date.slice(5)}</span>
        ))}
      </div>
    </>
  );
}

export default function DashboardView({
  preview = false,
  summary = PREVIEW_SUMMARY,
  recent = PREVIEW_RECENT,
}: {
  preview?: boolean;
  summary?: DashboardSummary;
  recent?: DetectionRow[];
}) {
  const trend = summary.trend;
  const weekTotal = trend.reduce((acc, day) => acc + day.count, 0);
  // 어제 대비 증감: 추이 마지막 이틀을 비교한다.
  const diff = trend.length >= 2 ? trend[trend.length - 1].count - trend[trend.length - 2].count : null;

  const metrics = [
    {
      title: "오늘 탐지", value: summary.today, tone: "red", Icon: TriangleAlert,
      foot: diff === null ? "어제 대비 집계 전" : `${Math.abs(diff)}건 어제 대비`,
      trend: diff === null ? undefined : diff >= 0 ? "up" : "down",
    },
    { title: "누적 탐지", value: summary.total, tone: "blue", Icon: TrendingUp, foot: "전체 탐지 게시글" },
    { title: "미확인", value: summary.unconfirmed, tone: "amber", Icon: Bell, foot: "검토 대기" },
    {
      title: "최근 7일", value: weekTotal, tone: "green", Icon: BarChart3,
      foot: trend.length > 0 ? `일 평균 ${(weekTotal / trend.length).toFixed(1)}건` : "집계 데이터 없음",
    },
  ];

  return (
    <div className={`${styles.dashboard} ${preview ? styles.preview : ""}`}>
      {preview && <div className={styles.demoLabel}><i />화면 예시 · 실제 운영 데이터가 아닙니다</div>}
      <div className={styles.metrics}>
        {metrics.map((metric) => <section className={styles.metric} key={metric.title} data-tone={metric.tone}>
          <div className={styles.metricTop}><h2>{metric.title}</h2><span aria-hidden="true"><metric.Icon /></span></div>
          <p className={styles.metricValue}>{metric.value.toLocaleString("ko-KR")}</p>
          <p className={styles.metricFoot}>
            {metric.trend === "up" && <ArrowUp aria-hidden="true" />}
            {metric.trend === "down" && <ArrowDown aria-hidden="true" />}
            {metric.foot}
          </p>
        </section>)}
      </div>
      <div className={styles.panels}>
        <section className={styles.panel} id={preview ? undefined : "recent"}>
          <header><h2><TriangleAlert aria-hidden="true" />최근 탐지 게시글</h2><small>{preview ? "탐지 결과 예시" : "최신 5건"}</small></header>
          {recent.length > 0 ? (
            <ul className={styles.posts}>{recent.slice(0, preview ? 3 : 5).map((post, index) => <li key={post.id || index}>
              <span className={styles.score} style={{ background: scoreColors(post.score).bg, color: scoreColors(post.score).fg, borderColor: scoreColors(post.score).border }}>{post.score.toFixed(2)}</span>
              <div className={styles.postBody}>
                <p>{preview || !post.id ? post.summary : <Link href={`/detections/${post.id}`}>{post.summary}</Link>}</p>
                <div><span>{post.nickname}</span>{post.keywords[0] && <em>{post.keywords[0]}</em>}<time>{post.detectedAt.slice(5)}</time></div>
              </div>
              <span className={styles.status} data-status={post.status}>{STATUS_LABEL[post.status]}</span>
            </li>)}</ul>
          ) : (
            <p className={styles.panelEmpty}>아직 탐지된 게시글이 없습니다.</p>
          )}
        </section>
        <section className={styles.panel}>
          <header><h2><BarChart3 aria-hidden="true" />최근 7일 탐지 추이</h2><small>{preview ? "예시" : "일별 건수"}</small></header>
          {trend.length > 0 ? (
            <div className={styles.lineChart} role="img" aria-label={`최근 ${trend.length}일간 일별 탐지 추이`}>
              <TrendLineChart trend={trend} />
            </div>
          ) : (
            <p className={styles.panelEmpty}>집계된 추이 데이터가 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}
