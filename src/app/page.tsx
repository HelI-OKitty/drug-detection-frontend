import Link from "next/link";
import DashboardView from "@/components/dashboard-view";
import MemberInfo from "@/components/member-info";
import styles from "./home.module.css";

const features = [
  { icon: "search", title: "텍스트 분석", text: <>게시글을 입력하고<br />의심 여부를 간편하게 확인하세요.</> },
  { icon: "alert", title: "지능형 탐지", text: <>AI 기반 텍스트 분석으로<br />잠재적인 위험 신호를 살펴보세요.</> },
  { icon: "chart", title: "직관적인 대시보드", text: <>탐지 현황과 검토 흐름을<br />한눈에 확인하는 화면입니다.</> },
  { icon: "shield", title: "안전한 시작", text: <>계정을 만들고 로그인해<br />SENTINEL을 시작하세요.</> },
];

function FeatureIcon({ name }: { name: string }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>}
    {name === "alert" && <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3v.1" /></>}
    {name === "chart" && <><path d="M3 13h4v8H3zm7-5h4v13h-4zm7-5h4v18h-4z" /></>}
    {name === "shield" && <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>}
  </svg>;
}

export default function Home() {
  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}><i />SENTINEL</Link>
          <nav className={styles.nav} aria-label="주요 메뉴"><a href="#about">제품 소개</a><a href="#features">주요 기능</a><a href="#faq">자주 묻는 질문</a></nav>
          <div className={styles.headerActions}><MemberInfo /></div>
        </div>
      </header>

      <main>
        <section id="about" className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>NARCOTICS WATCH CONSOLE</p>
              <h1>지금 감지하고,<br /><span>더 안전한 내일</span>을 만듭니다.</h1>
              <p className={styles.description}>의심스러운 게시글, 혼자 판단하지 마세요.<br />SENTINEL의 텍스트 분석으로 위험 신호를 확인하고,<br className={styles.desktopBreak} /> 더 안전한 온라인 환경을 만들어 가세요.</p>
              <div className={styles.heroActions}><Link href="/signup" className={styles.button}>시작하기 <span aria-hidden="true">→</span></Link><Link href="/text-detector" className={styles.outlineButton}>텍스트 분석 체험</Link></div>
              <p className={styles.trustLabel}>복잡한 설정 없이, 텍스트 입력부터 시작하세요.</p>
              <div className={styles.trustItems}><span>◇ 간편한 분석</span><span>◎ 명확한 결과</span><span>△ 빠른 확인</span></div>
            </div>
            <div className={styles.previewFrame}>
              <div className={styles.previewSide}><div className={styles.miniBrand}><i />SENTINEL</div><span className={styles.activeMini}>▦ 대시보드</span><span>⌕ 텍스트 분석</span><span>△ 탐지 게시글</span><span>☷ 탐지 임계치</span><span>♧ 알림 채널</span><span>↗ 대상 URL 관리</span></div>
              <div className={styles.previewMain}><div className={styles.previewHeader}><strong>탐지 대시보드</strong><span>/ summary</span></div><DashboardView preview /></div>
              <Link href="/dashboard" className={styles.previewLink}>대시보드 미리보기 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>

        <section id="features" className={styles.features} aria-label="주요 기능">
          {features.map((feature) => <article key={feature.title}><div className={styles.featureIcon}><FeatureIcon name={feature.icon} /></div><h2>{feature.title}</h2><p>{feature.text}</p></article>)}
        </section>

        <section className={styles.cta} aria-labelledby="cta-title">
          <div className={styles.ctaArt} aria-hidden="true"><div><i /><i /><i /></div><span /><section><b /><b /><b /></section></div>
          <div><h2 id="cta-title">보안의 새로운 기준, SENTINEL</h2><p>지금 바로 시작하고,<br />한층 더 안전한 환경을 만들어 보세요.</p></div>
          <Link href="/signup" className={styles.button}>시작하기 <span aria-hidden="true">→</span></Link>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <h2 id="faq-title">자주 묻는 질문</h2>
          <details><summary>SENTINEL은 어떤 서비스인가요?</summary><p>게시글 텍스트를 분석해 마약 관련 의심 여부를 확인하는 서비스입니다. 분석 결과는 게시글의 맥락과 함께 검토해 주세요.</p></details>
          <details><summary>어떻게 텍스트를 분석하나요?</summary><p>텍스트 분석 화면에서 게시글을 입력하고 분석하기를 누르세요. 분석이 완료되면 의심 신호 탐지 여부를 확인할 수 있습니다.</p></details>
          <details><summary>가입 전에 사용해 볼 수 있나요?</summary><p>텍스트 분석은 로그인 없이 체험할 수 있습니다. <Link href="/text-detector">지금 분석하기 →</Link></p></details>
        </section>
      </main>

      <footer className={styles.footer}><Link href="/" className={styles.brand}><i />SENTINEL</Link><Link href="/dashboard">대시보드</Link><Link href="/text-detector">텍스트 분석</Link><span>© {new Date().getFullYear()} SENTINEL. All rights reserved.</span></footer>
    </div>
  );
}
