import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { AnalysisStats, DashboardSummary } from "@/lib/detections-api";
import ui from "./dashboard.module.css";
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

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** 두 값의 비율을 누적 막대 + 범례로 보여준다. */
function RatioBar({
  a,
  b,
  aLabel,
  bLabel,
  aColor,
  bColor,
  unit = "건",
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
  unit?: string;
}) {
  const total = a + b;
  return (
    <div className={styles.ratio}>
      <div className={styles.ratioBar} aria-hidden="true">
        <i style={{ width: `${total > 0 ? (a / total) * 100 : 0}%`, background: aColor }} />
        <i style={{ width: `${total > 0 ? (b / total) * 100 : 0}%`, background: bColor }} />
      </div>
      <div className={styles.ratioLegend}>
        <span><i style={{ background: aColor }} />{aLabel} {a.toLocaleString("ko-KR")}{unit} · {percent(a, total)}%</span>
        <span><i style={{ background: bColor }} />{bLabel} {b.toLocaleString("ko-KR")}{unit} · {percent(b, total)}%</span>
      </div>
    </div>
  );
}

/** 항목별 건수를 가로 막대로 나열한다. */
function CountBars({ items, ranked = false }: { items: { name: string; count: number }[]; ranked?: boolean }) {
  if (items.length === 0) return <p className={styles.statEmpty}>집계된 항목이 없습니다.</p>;
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className={ranked ? ui.rankList : ui.countBars}>
      {items.map((item, index) => (
        <li key={item.name}>
          {ranked && <span className={ui.rank}>{index + 1}</span>}
          <span className={ui.countName} title={item.name}>{item.name}</span>
          {!ranked && <i className={ui.countTrack} aria-hidden="true">
            <b style={{ width: `${(item.count / max) * 100}%`, background: "var(--accent)" }} />
          </i>}
          <span className={ui.countValue}>{item.count.toLocaleString("ko-KR")}건</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardView({
  preview = false,
  summary = PREVIEW_SUMMARY,
  stats = null,
  verdictCounts = null,
}: {
  preview?: boolean;
  summary?: DashboardSummary;
  /** 상세 응답에서 집계한 분석 통계 */
  stats?: AnalysisStats | null;
  verdictCounts?: { positive: number; negative: number; unknown: number } | null;
}) {
  // 예시 데이터는 비로그인 미리보기에서만 사용한다.
  const text = stats
    ? { total: stats.analyzedText, model: stats.textModel, ruleOnly: stats.textRuleOnly, terms: stats.terms, intents: stats.intents }
    : { total: 0, model: 0, ruleOnly: 0, terms: [], intents: [] };
  const image = stats
    ? { total: stats.imageTotal, withOcr: stats.withOcr, withoutOcr: stats.withoutOcr, objects: stats.objects }
    : { total: 0, withOcr: 0, withoutOcr: 0, objects: [] };
  const weekTotal = summary.trend.reduce((sum, day) => sum + day.count, 0);
  const maxCount = Math.max(1, ...summary.trend.map((day) => day.count));
  const pendingPercent = Math.min(100, percent(summary.unconfirmed, summary.total));
  const verdictTotal = verdictCounts ? verdictCounts.positive + verdictCounts.negative + verdictCounts.unknown : 0;
  const verdictSegments = verdictCounts ? [
    { key: "positive", label: "양성", count: verdictCounts.positive, color: "#cf2548" },
    { key: "negative", label: "음성", count: verdictCounts.negative, color: "#087e56" },
    { key: "unknown", label: "판정 미제공", count: verdictCounts.unknown, color: "#94a3b8" },
  ] : [];
  const metrics = [
    { title: "미확인 게시글", value: summary.unconfirmed, href: "/detections?status=unreviewed", action: "검토하기", pending: true },
    { title: "오늘 탐지", value: summary.today, href: "/detections?period=today", action: "오늘 게시글" },
    { title: "전체 탐지", value: summary.total, href: "/detections", action: "전체 목록" },
  ];

  return (
    <div className={`${ui.dashboard} ${preview ? ui.preview : ""}`}>
      <h1 className={ui.srOnly}>대시보드</h1>
      {preview && <p className={ui.previewNote}>화면 예시 · 실제 운영 데이터가 아닙니다</p>}
      <div className={ui.overview}>
        {metrics.map((metric) => <section key={metric.title} data-priority={metric.pending || undefined}>
          <h2>{metric.title}</h2>
          <p className={ui.metric}>{metric.value.toLocaleString("ko-KR")}<small>건</small></p>
          {preview ? <span className={ui.muted}>{metric.action}</span> : <Link href={metric.href} className={metric.pending ? ui.primaryAction : undefined}>{metric.action}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
        </section>)}
      </div>

      {!preview && <div className={ui.distributions}>
      <section className={ui.panel} aria-label="전체 종합 판정 비율">
        <header><div><h2>종합 판정 분포</h2><p>{verdictCounts ? `전체 목록 ${verdictTotal.toLocaleString("ko-KR")}건 기준` : "전체 탐지 게시글 기준"}</p></div></header>
        {!verdictCounts ? <p className={ui.empty}>판정 통계를 불러오지 못했습니다.</p> : verdictTotal === 0 ? <p className={ui.empty}>아직 탐지 게시글이 없습니다.</p> : <div className={ui.verdictBody}>
          <div className={ui.ring} aria-hidden="true" style={{ background: `conic-gradient(#cf2548 0% ${verdictCounts.positive / verdictTotal * 100}%, #087e56 ${verdictCounts.positive / verdictTotal * 100}% ${(verdictCounts.positive + verdictCounts.negative) / verdictTotal * 100}%, #94a3b8 ${(verdictCounts.positive + verdictCounts.negative) / verdictTotal * 100}% 100%)` }}><span><strong>{verdictTotal.toLocaleString("ko-KR")}</strong>전체 게시글</span></div>
          <div className={ui.distributionLegend}>{verdictSegments.map((segment) => <Link key={segment.key} href={`/detections?verdict=${segment.key}`}>
            <span><i style={{ background: segment.color }} aria-hidden="true" />{segment.label}</span>
            <strong>{(segment.count / verdictTotal * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%</strong><small>{segment.count.toLocaleString("ko-KR")}건</small>
          </Link>)}</div>
        </div>}
      </section>
        <section className={ui.panel}>
          <header><div><h2>검토 현황</h2><p>전체 탐지 게시글 기준</p></div></header>
          <div className={ui.review}>
            <div className={ui.ring} style={{ background: `conic-gradient(var(--attention) 0% ${pendingPercent}%, var(--track) ${pendingPercent}% 100%)` }} role="img" aria-label={`전체 중 미확인 ${pendingPercent}%`}><span><strong>{pendingPercent}%</strong>미확인</span></div>
            <div className={ui.reviewSummary}>
              <dl>
                <div><dt><i aria-hidden="true" />미확인</dt><dd>{summary.unconfirmed.toLocaleString("ko-KR")}건</dd></div>
                <div><dt>전체 게시글</dt><dd>{summary.total.toLocaleString("ko-KR")}건</dd></div>
              </dl>
              {!preview && <Link href="/detections?status=unreviewed">미확인 목록 보기 <ArrowUpRight size={15} aria-hidden="true" /></Link>}
            </div>
          </div>
        </section>
      </div>}

      <div className={ui.activity}>
        <section className={ui.panel}>
          <header><div><h2>최근 탐지 추이</h2><p>최근 7일 · KST 기준</p></div><span>합계 <strong>{weekTotal.toLocaleString("ko-KR")}</strong>건</span></header>
          {summary.trend.length ? <ol className={ui.bars} aria-label="날짜별 탐지 건수">
            {summary.trend.map((day) => <li key={day.date}>
              <div className={ui.barColumn}><span>{day.count.toLocaleString("ko-KR")}</span><i style={{ height: `${day.count / maxCount * 112}px` }} aria-hidden="true" /></div>
              <time dateTime={day.date.length === 10 ? day.date : undefined}>{day.date.slice(-5).replace("-", "/")}</time>
            </li>)}
          </ol> : <p className={ui.empty}>아직 탐지 추이가 없습니다.</p>}
        </section>

      </div>

      {!preview && (!stats ? <p className={ui.unavailable} role="status">분석 통계를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p> : <>
        <div className={ui.analysis}>
          <section className={ui.panel}>
            <header><div><h2>텍스트 분석</h2><p>분석된 텍스트 {text.total.toLocaleString("ko-KR")}건</p></div></header>
            <div className={ui.body}>
              <h3>자주 탐지된 용어</h3><CountBars items={text.terms} />
              <h3>탐지된 의도</h3><CountBars items={text.intents} ranked />
            </div>
          </section>
          <section className={ui.panel}>
            <header><div><h2>이미지 분석</h2><p>분석된 이미지 {image.total.toLocaleString("ko-KR")}장</p></div></header>
            <div className={ui.body}>
              <h3>검출 객체 분포</h3><CountBars items={image.objects} />
              <h3>이미지 내 텍스트</h3>
              <dl className={ui.ocrSummary}>
                <div><dt>텍스트 포함</dt><dd>{image.withOcr.toLocaleString("ko-KR")}<small>장</small></dd></div>
                <div><dt>텍스트 없음</dt><dd>{image.withoutOcr.toLocaleString("ko-KR")}<small>장</small></dd></div>
              </dl>
            </div>
          </section>
        </div>
        <details className={ui.methods}>
          <summary>분석 방식 상세<ChevronDown size={16} aria-hidden="true" /></summary>
          <div><h3>텍스트 판정 방식</h3><RatioBar a={text.model} b={text.ruleOnly} aLabel="모델 분석" bLabel="규칙(사전) 판정" aColor="var(--accent)" bColor="var(--chart-muted)" /></div>
        </details>
      </>)}
    </div>
  );
}
