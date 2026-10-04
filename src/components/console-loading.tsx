import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeft, BarChart3, Bell, Hash, KeyRound, Radar, ScanSearch, Timer, TriangleAlert, UserCog,
} from "lucide-react";
import { ConsoleShell } from "./console-shell";
import styles from "./console.module.css";
import listStyles from "./detections.module.css";
import formStyles from "./settings.module.css";

type Variant = "dashboard" | "detections" | "detection-detail" | "account" | "settings" | "crawl" | "analyze";

/** 데이터가 들어올 자리만 차지하는 쉬머 블록 */
function Sk({ w = "100%", h = 12, r = 7, style }: { w?: number | string; h?: number; r?: number | string; style?: CSSProperties }) {
  return <i className={styles.sk} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function DashboardSkeleton() {
  const metrics = [
    { title: "오늘 탐지", tone: "red", Icon: TriangleAlert },
    { title: "누적 탐지", tone: "blue", Icon: BarChart3 },
    { title: "미확인", tone: "amber", Icon: Bell },
    { title: "최근 7일", tone: "green", Icon: BarChart3 },
  ];
  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <section className={styles.metric} key={metric.title} data-tone={metric.tone}>
            <div className={styles.metricTop}><h2>{metric.title}</h2><span aria-hidden="true"><metric.Icon /></span></div>
            <p className={styles.metricValue}><Sk w={82} h={40} r={9} /></p>
            <p className={styles.metricFoot}><Sk w={110} h={11} /></p>
          </section>
        ))}
      </div>
      <div className={styles.panels}>
        <section className={styles.panel}>
          <header><h2><TriangleAlert aria-hidden="true" />최근 탐지 게시글</h2><small>최신 5건</small></header>
          <ul className={styles.posts}>
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index}>
                <Sk w={48} h={33} r={9} />
                <div className={styles.postBody}>
                  <p><Sk w={`${88 - (index % 3) * 14}%`} h={12} /></p>
                  <div><Sk w={150} h={10} /></div>
                </div>
                <Sk w={48} h={22} r={8} />
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.panel}>
          <header><h2><BarChart3 aria-hidden="true" />최근 7일 탐지 추이</h2><small>일별 건수</small></header>
          <div className={styles.lineChart}><Sk h={176} r={11} /></div>
        </section>
      </div>
    </div>
  );
}

function DetectionsSkeleton() {
  return (
    <div className={listStyles.page}>
      <div className={listStyles.toolbar}>
        <div className={listStyles.search}><Sk h={48} r={11} /></div>
        <div className={listStyles.chips}>
          {["전체", "미확인", "검토중", "확정"].map((label) => (
            <button key={label} type="button" className={listStyles.chip} disabled>{label}</button>
          ))}
        </div>
      </div>
      <div className={listStyles.card}>
        <div className={listStyles.tableWrap}>
          <table className={listStyles.table}>
            <thead>
              <tr>
                <th scope="col">SCORE</th>
                <th scope="col">게시글</th>
                <th scope="col">닉네임</th>
                <th scope="col">출처</th>
                <th scope="col">탐지 시각</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, index) => (
                <tr key={index}>
                  <td><Sk w={56} h={32} r={9} /></td>
                  <td className={listStyles.summaryCell}><Sk w={`${92 - (index % 4) * 10}%`} h={14} /></td>
                  <td><Sk w={92} h={13} /></td>
                  <td><Sk w={48} h={13} /></td>
                  <td><Sk w={74} h={13} /></td>
                  <td><Sk w={52} h={23} r={8} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetectionDetailSkeleton() {
  return (
    <div className={listStyles.page}>
      <Link href="/detections" className={listStyles.backLink}><ArrowLeft aria-hidden="true" />목록으로</Link>
      <div className={listStyles.detailLayout}>
        <article className={listStyles.postCard}>
          <header className={listStyles.postHeader}>
            <div className={listStyles.postIdentity} style={{ flex: 1 }}>
              <Sk w={150} h={16} />
              <Sk w={210} h={12} style={{ marginTop: 9 }} />
            </div>
            <Sk w={52} h={23} r={8} />
          </header>
          <div style={{ marginTop: 24, display: "grid", gap: 13 }}>
            <Sk h={14} /><Sk h={14} /><Sk w="72%" h={14} />
          </div>
          <div className={listStyles.images}>
            {Array.from({ length: 3 }, (_, index) => <Sk key={index} h={150} r={11} style={{ aspectRatio: "1/1.02", height: "auto" }} />)}
          </div>
        </article>
        <aside className={listStyles.aside}>
          <section className={listStyles.asideCard}>
            <h2 className={listStyles.asideTitle}>AI 위험 점수</h2>
            <div className={listStyles.gaugeWrap}><Sk w={150} h={150} r="50%" /></div>
          </section>
          <section className={listStyles.asideCard}>
            <h2 className={listStyles.asideTitle}>메타데이터</h2>
            <div style={{ display: "grid", gap: 15 }}><Sk h={13} /><Sk h={13} /><Sk h={13} /><Sk w="70%" h={13} /></div>
          </section>
          <section className={listStyles.asideCard}>
            <h2 className={listStyles.asideTitle}>탐지 키워드</h2>
            <div className={listStyles.keywords}><Sk w={64} h={32} r={8} /><Sk w={78} h={32} r={8} /><Sk w={56} h={32} r={8} /></div>
          </section>
          <section className={listStyles.asideCard}>
            <h2 className={listStyles.asideTitle}>처리</h2>
            <div className={listStyles.actions}><Sk h={52} r={10} /><Sk h={52} r={10} /></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** 공통 카드 틀: 실제 헤더(아이콘·제목)는 그대로, 본문만 스켈레톤 */
function CardSkeleton({ Icon, title, children }: { Icon: typeof UserCog; title: string; children: React.ReactNode }) {
  return (
    <section className={formStyles.card}>
      <header className={formStyles.cardHeader}>
        <h2><Icon aria-hidden="true" />{title}</h2>
        <Sk w={52} h={10} />
      </header>
      <div className={formStyles.cardBody}>{children}</div>
    </section>
  );
}

function AccountSkeleton() {
  return (
    <div className={formStyles.page}>
      <CardSkeleton Icon={UserCog} title="기본 정보">
        <div style={{ display: "grid", gap: 14, marginBottom: 20 }}><Sk h={13} /><Sk h={13} /></div>
        <div className={formStyles.fieldGrid}><Sk h={44} r={10} /><Sk h={44} r={10} /></div>
      </CardSkeleton>
      <CardSkeleton Icon={Bell} title="알림 설정">
        <div style={{ display: "grid", gap: 14 }}><Sk h={26} w={46} r={999} /><Sk h={44} r={10} /></div>
      </CardSkeleton>
      <CardSkeleton Icon={KeyRound} title="비밀번호 변경">
        <div className={formStyles.fieldGrid}><Sk h={44} r={10} /><Sk h={44} r={10} /></div>
      </CardSkeleton>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className={formStyles.page}>
      <CardSkeleton Icon={Hash} title="탐지 키워드">
        <div className={formStyles.chipGrid}>
          {Array.from({ length: 11 }, (_, index) => <Sk key={index} w={58 + (index % 4) * 12} h={40} r={10} />)}
        </div>
      </CardSkeleton>
      <CardSkeleton Icon={Timer} title="탐지 간격">
        <div className={formStyles.chipGrid}>
          {Array.from({ length: 7 }, (_, index) => <Sk key={index} w={60} h={40} r={10} />)}
        </div>
      </CardSkeleton>
      <CardSkeleton Icon={Hash} title="탐지 갯수">
        <div style={{ display: "flex", gap: 10 }}><Sk w={44} h={44} r={10} /><Sk w={90} h={44} r={10} /><Sk w={44} h={44} r={10} /></div>
      </CardSkeleton>
    </div>
  );
}

function CrawlSkeleton() {
  return (
    <div className={formStyles.page}>
      <CardSkeleton Icon={Radar} title="수동 크롤링 실행">
        <div style={{ display: "grid", gap: 14 }}>
          <Sk w="80%" h={12} />
          <Sk h={46} r={11} />
          <div style={{ display: "flex", gap: 10 }}><Sk w={44} h={44} r={10} /><Sk w={90} h={44} r={10} /><Sk w={44} h={44} r={10} /></div>
        </div>
      </CardSkeleton>
    </div>
  );
}

function AnalyzeSkeleton() {
  return (
    <div className={formStyles.page}>
      <CardSkeleton Icon={ScanSearch} title="단순 분석">
        <div style={{ display: "grid", gap: 14 }}>
          <Sk w="70%" h={12} />
          <Sk h={220} r={11} />
          <Sk w={120} h={44} r={10} />
        </div>
      </CardSkeleton>
    </div>
  );
}

const SKELETONS: Record<Variant, () => React.ReactNode> = {
  dashboard: DashboardSkeleton,
  detections: DetectionsSkeleton,
  "detection-detail": DetectionDetailSkeleton,
  account: AccountSkeleton,
  settings: SettingsSkeleton,
  crawl: CrawlSkeleton,
  analyze: AnalyzeSkeleton,
};

export default function ConsoleLoading({ variant }: { variant: Variant }) {
  const Skeleton = SKELETONS[variant];
  return (
    <ConsoleShell memberInfo={null}>
      <div role="status" aria-label="화면을 불러오는 중"><Skeleton /></div>
    </ConsoleShell>
  );
}
