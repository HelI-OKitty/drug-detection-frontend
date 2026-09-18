"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./console.module.css";

export function ConsoleShell({ children, memberInfo }: { children: ReactNode; memberInfo: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><i />SENTINEL</Link>
        <p className={styles.caption}>NARCOTICS WATCH CONSOLE</p>
        <nav aria-label="콘솔 메뉴" className={styles.nav}>
          <p>모니터링</p>
          <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}><span aria-hidden="true">▦</span>대시보드</Link>
          <Link href="/text-detector" aria-current={pathname === "/text-detector" ? "page" : undefined}><span aria-hidden="true">⌕</span>텍스트 분석</Link>
          <Link href="/dashboard#recent"><span aria-hidden="true">△</span>탐지 게시글 <small>예시</small></Link>
          <p>설정</p>
          <button disabled>탐지 임계치 <small>준비 중</small></button>
          <button disabled>알림 채널 <small>준비 중</small></button>
          <button disabled>대상 URL 관리 <small>준비 중</small></button>
        </nav>
        <div className={styles.sidebarFooter}><span className={styles.avatar}>S</span><div>모니터링 콘솔<small>안전한 내일을 위한 시작</small></div></div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}><strong>{pathname === "/text-detector" ? "텍스트 분석" : "탐지 대시보드"}</strong><span className={styles.breadcrumb}>/ {pathname === "/text-detector" ? "text analysis" : "dashboard / summary"}</span><div className={styles.memberInfo}>{memberInfo}</div></header>
        {children}
      </div>
    </div>
  );
}
