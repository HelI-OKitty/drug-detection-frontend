import { ArrowDown, ArrowUp, Bell, RefreshCw, TrendingUp, TriangleAlert } from "lucide-react";
import styles from "./console.module.css";

const posts = [
  { score: "0.92", text: "의심 키워드와 외부 연락 유도 문구가 포함된 게시글", tag: "키워드 탐지", time: "05-29 02:14", status: "NEW" },
  { score: "0.88", text: "거래를 유도하는 표현이 발견된 게시글", tag: "패턴 탐지", time: "05-29 01:50", status: "NEW" },
  { score: "0.85", text: "외부 메신저 채널로 연결하는 의심 게시글", tag: "외부 링크", time: "05-28 23:31", status: "REVIEW" },
  { score: "0.81", text: "배송 및 거래 관련 의심 표현이 포함된 게시글", tag: "내용 검토", time: "05-28 22:08", status: "NEW" },
  { score: "0.79", text: "검토가 완료된 키워드 탐지 게시글", tag: "검토 완료", time: "05-28 20:44", status: "확정" },
];
const metrics = [
  { title: "오늘 탐지", value: "5", foot: "2건 어제 대비", trend: "up", tone: "red", Icon: TriangleAlert },
  { title: "누적 탐지", value: "123", foot: "전체 탐지 게시글", tone: "blue", Icon: TrendingUp },
  { title: "미확인", value: "12", foot: "검토 대기", tone: "amber", Icon: Bell },
  { title: "크롤링 처리량", value: "8.4", suffix: "k", foot: "1.4% 노이즈 필터링됨", trend: "down", tone: "green", Icon: RefreshCw },
];

export default function DashboardView({ preview = false }: { preview?: boolean }) {
  return (
    <div className={`${styles.dashboard} ${preview ? styles.preview : ""}`}>
      <div className={styles.demoLabel}><i />화면 예시 · 실제 운영 데이터가 아닙니다</div>
      <div className={styles.metrics}>
        {metrics.map((metric) => <section className={styles.metric} key={metric.title} data-tone={metric.tone}>
          <div className={styles.metricTop}><h2>{metric.title}</h2><span aria-hidden="true"><metric.Icon /></span></div>
          <p className={styles.metricValue}>{metric.value}<small>{metric.suffix}</small></p>
          <p className={styles.metricFoot}>
            {metric.trend === "up" && <ArrowUp aria-hidden="true" />}
            {metric.trend === "down" && <ArrowDown aria-hidden="true" />}
            {metric.foot}
          </p>
        </section>)}
      </div>
      <div className={styles.panels}>
        <section className={styles.panel} id={preview ? undefined : "recent"}>
          <header><h2><TriangleAlert aria-hidden="true" />최근 탐지 게시글</h2><small>탐지 결과 예시</small></header>
          <ul className={styles.posts}>{posts.slice(0, preview ? 3 : 5).map((post, index) => <li key={post.score}>
            <span className={styles.score} data-low={index === 4}>{post.score}</span>
            <div className={styles.postBody}><p>{post.text}</p><div><span>@sample_{index + 1}</span><em>{post.tag}</em><time>{post.time}</time></div></div>
            <span className={styles.status} data-status={post.status}>{post.status}</span>
          </li>)}</ul>
        </section>
        <section className={styles.panel}>
          <header><h2><Bell aria-hidden="true" />알림 이력</h2><small>예시</small></header>
          <ul className={styles.notifications}>{[
            ["신규 탐지", "의심 게시글이 발견되었습니다.", "3분 전"],
            ["키워드 감지", "검토가 필요한 표현을 발견했습니다.", "27분 전"],
            ["상태 변경", "게시글 검토를 시작했습니다.", "1시간 전"],
            ...(!preview ? [["검토 완료", "탐지 게시글 검토가 완료되었습니다.", "2시간 전"], ["오탐 제외", "검토 결과 의심 목록에서 제외했습니다.", "4시간 전"]] : []),
          ].map(([title, description, time], index) => <li key={title}><i data-index={index} /><div><p><strong>{title}</strong> · {description}</p><small>{time}</small></div></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
