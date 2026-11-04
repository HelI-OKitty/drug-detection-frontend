import { BarChart3, FileText, Images, TrendingUp, TriangleAlert } from "lucide-react";
import type { AnalysisStats, DashboardSummary } from "@/lib/detections-api";
import CollectionTrendChart from "./collection-trend-chart";
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

/** 비로그인 미리보기 전용 예시 통계. 운영 화면에서는 사용하지 않는다. */
function buildMockStats(summary: DashboardSummary) {
  const positive = summary.total;
  const negative = positive > 0 ? Math.round(positive * 2.4) + 4 : 0;
  const total = positive + negative;
  const trend = summary.trend.map((day, index) => ({
    date: day.date,
    positive: day.count,
    negative: day.count > 0 ? day.count * 2 + ((index * 7) % 5) + 1 : (index * 3) % 4,
  }));
  const model = Math.round(total * 0.72);
  const withOcr = Math.round(total * 0.46);
  const scale = (ratio: number, min = 1) => (positive > 0 ? Math.max(min, Math.round(positive * ratio)) : 0);
  return {
    total,
    positive,
    negative,
    trend,
    text: {
      model,
      ruleOnly: total - model,
      // 단어 사전(용어) 매칭 분포
      terms: [
        { name: "브액", count: scale(0.52) },
        { name: "아이스", count: scale(0.38) },
        { name: "작대기", count: scale(0.29) },
        { name: "빙두", count: scale(0.17) },
        { name: "대마", count: scale(0.08) },
      ],
      // 동사 사전(의도) 매칭 분포
      intents: [
        { name: "팝니다", count: scale(0.44) },
        { name: "문의", count: scale(0.31) },
        { name: "배송", count: scale(0.22) },
        { name: "거래", count: scale(0.13) },
        { name: "구합니다", count: scale(0.06) },
      ],
    },
    image: {
      withOcr,
      withoutOcr: total - withOcr,
      objects: [
        { name: "Cocaine", count: scale(0.21) },
        { name: "Heroin", count: scale(0.13) },
        { name: "Shrooms", count: scale(0.09) },
        { name: "Marijuana", count: scale(0.05) },
      ],
    },
  };
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/**
 * 대시보드 공통 팔레트. 역할당 색 하나만 쓴다.
 * 파랑=전체·모델(집계) / 연파랑=규칙(모델의 보조) / 빨강=양성·마약 신호 / 초록=음성·정상 / 연회색=없음
 */
const COLOR = {
  total: "#3c82f6",
  secondary: "#9fc4fa",
  positive: "#ee4765",
  negative: "#0aaa75",
  none: "#d4dde6",
} as const;

/** 두 값의 비율을 누적 막대 + 범례로 보여준다. */
function RatioBar({
  a,
  b,
  aLabel,
  bLabel,
  aColor,
  bColor,
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
}) {
  const total = a + b;
  return (
    <div className={styles.ratio}>
      <div className={styles.ratioBar} aria-hidden="true">
        <i style={{ width: `${total > 0 ? (a / total) * 100 : 0}%`, background: aColor }} />
        <i style={{ width: `${total > 0 ? (b / total) * 100 : 0}%`, background: bColor }} />
      </div>
      <div className={styles.ratioLegend}>
        <span><i style={{ background: aColor }} />{aLabel} {a.toLocaleString("ko-KR")}건 · {percent(a, total)}%</span>
        <span><i style={{ background: bColor }} />{bLabel} {b.toLocaleString("ko-KR")}건 · {percent(b, total)}%</span>
      </div>
    </div>
  );
}

/** 항목별 건수를 가로 막대로 나열한다. */
function CountBars({ items, color }: { items: { name: string; count: number }[]; color: string }) {
  if (items.length === 0) return <p className={styles.statEmpty}>집계된 항목이 없습니다.</p>;
  const max = Math.max(1, ...items.map((item) => item.count));
  const total = items.reduce((acc, item) => acc + item.count, 0);
  return (
    <ul className={styles.countBars}>
      {items.map((item) => (
        <li key={item.name}>
          <span className={styles.countName} title={item.name}>{item.name}</span>
          <i className={styles.countTrack} aria-hidden="true">
            <b style={{ width: `${(item.count / max) * 100}%`, background: color }} />
          </i>
          <span className={styles.countValue}>{item.count}건 · {percent(item.count, total)}%</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardView({
  preview = false,
  summary = PREVIEW_SUMMARY,
  stats = null,
}: {
  preview?: boolean;
  summary?: DashboardSummary;
  /** 상세 응답에서 집계한 분석 통계 */
  stats?: AnalysisStats | null;
}) {
  const mock = preview ? buildMockStats(summary) : null;
  // 예시 데이터는 비로그인 미리보기에서만 사용한다.
  const text = stats
    ? { total: stats.analyzedText, model: stats.textModel, ruleOnly: stats.textRuleOnly, terms: stats.terms, intents: stats.intents }
    : mock ? { total: mock.total, ...mock.text } : { total: 0, model: 0, ruleOnly: 0, terms: [], intents: [] };
  const image = stats
    ? { total: stats.imageTotal, withOcr: stats.withOcr, withoutOcr: stats.withoutOcr, objects: stats.objects }
    : mock ? { total: mock.total, withOcr: mock.image.withOcr, withoutOcr: mock.image.withoutOcr, objects: mock.image.objects } : { total: 0, withOcr: 0, withoutOcr: 0, objects: [] };
  const trend = summary.trend.map((day) => ({ ...day, total: day.count, positive: 0, negative: 0 }));
  const metrics = [
    { title: "전체 탐지", value: summary.total, tone: "blue", Icon: BarChart3, foot: "저장된 탐지 게시글" },
    { title: "미확인", value: summary.unconfirmed, tone: "red", Icon: TriangleAlert, foot: "검토가 필요한 게시글" },
    { title: "오늘 탐지", value: summary.today, tone: "slate", Icon: TrendingUp, foot: "오늘 저장된 게시글" },
  ];

  return (
    <div className={`${styles.dashboard} ${preview ? styles.preview : ""}`}>
      {preview && <div className={styles.demoLabel}><i />화면 예시 · 실제 운영 데이터가 아닙니다</div>}
      <div className={styles.metrics}>
        {metrics.map((metric) => <section className={styles.metric} key={metric.title} data-tone={metric.tone}>
          <div className={styles.metricTop}><h2>{metric.title}</h2><span aria-hidden="true"><metric.Icon /></span></div>
          <p className={styles.metricValue}>{metric.value.toLocaleString("ko-KR")}</p>
          <p className={styles.metricFoot}>{metric.foot}</p>
        </section>)}
      </div>

      <div className={`${styles.panels} ${styles.panelsSingle}`}>
        <section className={styles.panel}>
          <header>
            <h2><BarChart3 aria-hidden="true" />탐지 추이</h2>
            <small>최근 7일 · 합계 {summary.trend.reduce((sum, day) => sum + day.count, 0).toLocaleString("ko-KR")}건</small>
          </header>
          <div className={styles.lineChart}>
            <CollectionTrendChart trend={trend} totalOnly />
          </div>
        </section>
      </div>

      {!stats && !preview ? <p role="status">분석 통계를 불러오지 못했습니다.</p> : <div className={`${styles.panels} ${styles.panelsEven}`}>
        <section className={styles.panel}>
          <header>
            <h2><FileText aria-hidden="true" />텍스트 분석 통계</h2>
            <small>분석 {text.total.toLocaleString("ko-KR")}건</small>
          </header>
          <div className={styles.statBody}>
            <p className={styles.statLabel}>분석 방식</p>
            <RatioBar
              a={text.model}
              aLabel="모델 분석"
              aColor={COLOR.total}
              b={text.ruleOnly}
              bLabel="규칙(사전) 판정"
              bColor={COLOR.secondary}
            />
            <p className={styles.statLabel}>단어 사전(용어) 매칭 TOP {Math.max(text.terms.length, 1)}</p>
            <CountBars items={text.terms} color={COLOR.positive} />
            <p className={styles.statLabel}>동사 사전(의도) 매칭 TOP {Math.max(text.intents.length, 1)}</p>
            <CountBars items={text.intents} color={COLOR.positive} />
          </div>
        </section>
        <section className={styles.panel}>
          <header>
            <h2><Images aria-hidden="true" />이미지 분석 통계</h2>
            <small>이미지 {image.total.toLocaleString("ko-KR")}장 기준</small>
          </header>
          <div className={styles.statBody}>
            <p className={styles.statLabel}>텍스트(OCR) 포함 여부</p>
            <RatioBar
              a={image.withOcr}
              aLabel="텍스트 포함"
              aColor={COLOR.total}
              b={image.withoutOcr}
              bLabel="텍스트 없음"
              bColor={COLOR.none}
            />
            <p className={styles.statLabel}>검출 객체 분포</p>
            <CountBars items={image.objects} color={COLOR.positive} />
          </div>
        </section>
      </div>}
    </div>
  );
}
