import Link from "next/link";
import { ArrowRight, BarChart3, Bell, LayoutDashboard, Link2, Radar, ScanText, SearchCheck, ShieldCheck, SlidersHorizontal, TriangleAlert, Zap } from "lucide-react";
import DashboardView from "@/components/dashboard-view";
import MemberInfo from "@/components/member-info";
import styles from "./home.module.css";

const features = [
  { Icon: ScanText, title: "게시글 텍스트 분석", text: <>게시글을 입력하고 마약 거래<br />의심 여부를 간편하게 확인하세요.</> },
  { Icon: Radar, title: "마약 은어 탐지", text: <>AI 기반 텍스트 분석으로<br />은어와 거래 정황을 살펴보세요.</> },
  { Icon: BarChart3, title: "직관적인 대시보드", text: <>탐지 현황과 검토 흐름을<br />한눈에 확인하는 화면입니다.</> },
  { Icon: ShieldCheck, title: "안전한 시작", text: <>계정을 만들고 로그인해<br />SENTINEL을 시작하세요.</> },
];

const trustItems = [
  { Icon: SearchCheck, label: "은어·정황 분석" },
  { Icon: ShieldCheck, label: "의심 여부 판별" },
  { Icon: Zap, label: "빠른 확인" },
];

const previewMenu = [
  { Icon: LayoutDashboard, label: "대시보드", active: true },
  { Icon: ScanText, label: "텍스트 분석" },
  { Icon: TriangleAlert, label: "탐지 게시글" },
  { Icon: SlidersHorizontal, label: "탐지 임계치" },
  { Icon: Bell, label: "알림 채널" },
  { Icon: Link2, label: "대상 URL 관리" },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}><i />SENTINEL</Link>
          <nav className={styles.nav} aria-label="주요 메뉴"><a href="#about">제품 소개</a><a href="#features">주요 기능</a></nav>
          <div className={styles.headerActions}><MemberInfo /></div>
        </div>
      </header>

      <main>
        <section id="about" className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>마약 거래 의심 게시글 탐지 콘솔</p>
              <h1><span>마약 거래 의심 게시글</span>,<br />지금 감지하고 더 안전한 내일을 만듭니다.</h1>
              <p className={styles.description}>게시글 속 은어와 거래 정황, 혼자 판단하지 마세요.<br />SENTINEL의 텍스트 분석이 마약 거래 의심 여부를 판별해<br className={styles.desktopBreak} /> 더 안전한 온라인 환경을 만들어 갑니다.</p>
              <div className={styles.heroActions}><Link href="/signup" className={styles.button}>시작하기 <ArrowRight aria-hidden="true" /></Link><Link href="/text-detector" className={styles.outlineButton}>텍스트 분석 체험</Link></div>
              <p className={styles.trustLabel}>복잡한 설정 없이, 게시글 텍스트 입력부터 시작하세요.</p>
              <div className={styles.trustItems}>{trustItems.map(({ Icon, label }) => <span key={label}><Icon aria-hidden="true" />{label}</span>)}</div>
            </div>
            <div className={styles.previewFrame}>
              <div className={styles.previewSide}><div className={styles.miniBrand}><i />SENTINEL</div>{previewMenu.map(({ Icon, label, active }) => <span key={label} className={active ? styles.activeMini : undefined}><Icon aria-hidden="true" />{label}</span>)}</div>
              <div className={styles.previewMain}><div className={styles.previewHeader}><strong>탐지 대시보드</strong><span>/ summary</span></div><DashboardView preview /></div>
            </div>
          </div>
        </section>

        <section id="features" className={styles.features} aria-label="주요 기능">
          {features.map(({ Icon, title, text }) => <article key={title}><div className={styles.featureIcon}><Icon aria-hidden="true" /></div><h2>{title}</h2><p>{text}</p></article>)}
        </section>

        <section className={styles.cta} aria-labelledby="cta-title">
          <div className={styles.ctaArt} aria-hidden="true"><div><i /><i /><i /></div><span /><section><b /><b /><b /></section></div>
          <div><h2 id="cta-title">보안의 새로운 기준, SENTINEL</h2><p>지금 바로 시작하고,<br />한층 더 안전한 환경을 만들어 보세요.</p></div>
          <Link href="/signup" className={styles.button}>시작하기 <ArrowRight aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className={styles.footer}><Link href="/" className={styles.brand}><i />SENTINEL</Link><Link href="/dashboard">대시보드</Link><Link href="/text-detector">텍스트 분석</Link><span>© {new Date().getFullYear()} SENTINEL. All rights reserved.</span></footer>
    </div>
  );
}
