"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, Radar, ScanText, SlidersHorizontal, TriangleAlert, UserCog } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./console.module.css";

/** 경로별 상단 제목과 브레드크럼. 상세는 접두사로 판별한다. */
function topbarLabels(pathname: string) {
  if (pathname === "/analyze") return { title: "단순 분석", crumb: "analyze" };
  if (pathname === "/detections") return { title: "탐지 게시글 목록", crumb: "detections" };
  if (pathname.startsWith("/detections/")) {
    return { title: "탐지 게시글 상세", crumb: `detections / ${pathname.slice("/detections/".length)}` };
  }
  if (pathname === "/settings/detection") return { title: "탐지 설정", crumb: "settings / detection" };
  if (pathname === "/settings/account") return { title: "계정 관리", crumb: "settings / account" };
  if (pathname === "/admin/crawl") return { title: "크롤링 관리", crumb: "admin / crawl" };
  return { title: "탐지 대시보드", crumb: "dashboard / summary" };
}

export function ConsoleShell({ children, memberInfo }: { children: ReactNode; memberInfo: ReactNode }) {
  const pathname = usePathname();
  const { title, crumb } = topbarLabels(pathname);
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><i />SENTINEL</Link>
        <p className={styles.caption}>NARCOTICS WATCH CONSOLE</p>
        <nav aria-label="콘솔 메뉴" className={styles.nav}>
          <p>모니터링</p>
          <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard aria-hidden="true" />대시보드</Link>
          <Link href="/analyze" aria-current={pathname === "/analyze" ? "page" : undefined}><ScanText aria-hidden="true" />단순 분석</Link>
          <Link href="/detections" aria-current={pathname.startsWith("/detections") ? "page" : undefined}><TriangleAlert aria-hidden="true" />탐지 게시글</Link>
          <p>설정</p>
          <Link href="/settings/detection" aria-current={pathname === "/settings/detection" ? "page" : undefined}><SlidersHorizontal aria-hidden="true" />탐지 설정</Link>
          <button disabled><Bell aria-hidden="true" />알림 채널 <small>준비 중</small></button>
          <Link href="/settings/account" aria-current={pathname === "/settings/account" ? "page" : undefined}><UserCog aria-hidden="true" />계정 관리</Link>
          <p>관리자</p>
          <Link href="/admin/crawl" aria-current={pathname === "/admin/crawl" ? "page" : undefined}><Radar aria-hidden="true" />크롤링 관리</Link>
        </nav>
        <div className={styles.sidebarFooter}><span className={styles.avatar}>S</span><div>모니터링 콘솔<small>안전한 내일을 위한 시작</small></div></div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}><strong>{title}</strong><span className={styles.breadcrumb}>/ {crumb}</span><div className={styles.memberInfo}>{memberInfo}</div></header>
        {children}
      </div>
    </div>
  );
}
