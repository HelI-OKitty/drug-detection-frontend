import { BarChart3, FileText, Images, ShieldCheck, TrendingUp, TriangleAlert } from "lucide-react";
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

/**
 * TODO(mock): 백엔드가 음성 결과 저장·통계 API를 제공하기 전까지 쓰는 임시 통계.
 * 양성(positive)은 실제 저장 건수(summary)를 쓰고, 음성·텍스트/이미지 통계는
 * 그로부터 파생한 고정 mock이다. 통계 API가 생기면 이 함수를 교체한다.
 */
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
  /** 실데이터 집계. 미리보기·집계 실패 시 null이면 mock으로 대체 */
  stats?: AnalysisStats | null;
}) {
  const mock = buildMockStats(summary);
  // 텍스트·이미지 통계는 실데이터 집계가 있으면 그걸 쓰고, 없으면 mock을 쓴다.
  const text = stats
    ? { total: stats.analyzedText, model: stats.textModel, ruleOnly: stats.textRuleOnly, terms: stats.terms, intents: stats.intents }
    : { total: mock.total, ...mock.text };
  const image = stats
    ? { total: stats.imageTotal, withOcr: stats.withOcr, withoutOcr: stats.withoutOcr, objects: stats.objects }
    : { total: mock.total, withOcr: mock.image.withOcr, withoutOcr: mock.image.withoutOcr, objects: mock.image.objects };
  // TODO(mock): 오늘 수집 합계도 통계 API 제공 전까지 양성 건수 기반 파생값
  const todayTotal = summary.today > 0 ? summary.today * 3 + 1 : 0;

  const metrics = [
    { title: "전체 수집", value: mock.total, tone: "blue", Icon: BarChart3, foot: "수집·분석된 게시글" },
    { title: "양성 (의심)", value: mock.positive, tone: "red", Icon: TriangleAlert, foot: `전체의 ${percent(mock.positive, mock.total)}%` },
    { title: "음성 (정상)", value: mock.negative, tone: "green", Icon: ShieldCheck, foot: `전체의 ${percent(mock.negative, mock.total)}%` },
    { title: "오늘 수집", value: todayTotal, tone: "slate", Icon: TrendingUp, foot: `의심 ${summary.today}건 포함` },
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
            <h2><BarChart3 aria-hidden="true" />수집 추이</h2>
            <small>최근 7일 · 전체 {mock.total.toLocaleString("ko-KR")}건</small>
          </header>
          <div className={styles.lineChart}>
            <CollectionTrendChart trend={mock.trend} />
          </div>
        </section>
      </div>

      <div className={`${styles.panels} ${styles.panelsEven}`}>
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
      </div>
    </div>
  );
}
