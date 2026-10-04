"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, Link2, ScanText, SlidersHorizontal, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { unreviewedCount } from "@/lib/detections-sample";
import styles from "./console.module.css";

/** 경로별 상단 제목과 브레드크럼. 상세는 접두사로 판별한다. */
function topbarLabels(pathname: string) {
  if (pathname === "/text-detector") return { title: "텍스트 분석", crumb: "text analysis" };
  if (pathname === "/detections") return { title: "탐지 게시글 목록", crumb: "detections" };
  if (pathname.startsWith("/detections/")) {
    return { title: "탐지 게시글 상세", crumb: `detections / ${pathname.slice("/detections/".length)}` };
  }
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
          <Link href="/text-detector" aria-current={pathname === "/text-detector" ? "page" : undefined}><ScanText aria-hidden="true" />텍스트 분석</Link>
          <Link href="/detections" aria-current={pathname.startsWith("/detections") ? "page" : undefined}><TriangleAlert aria-hidden="true" />탐지 게시글 <small className={styles.count}>{unreviewedCount}</small></Link>
          <p>설정</p>
          <button disabled><SlidersHorizontal aria-hidden="true" />탐지 임계치 <small>준비 중</small></button>
          <button disabled><Bell aria-hidden="true" />알림 채널 <small>준비 중</small></button>
          <button disabled><Link2 aria-hidden="true" />대상 URL 관리 <small>준비 중</small></button>
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
