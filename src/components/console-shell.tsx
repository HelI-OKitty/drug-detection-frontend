"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radar, ScanText, SlidersHorizontal, TriangleAlert, UserCog } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./console.module.css";

function pageTitle(pathname: string) {
  if (pathname === "/analyze") return "단순 분석";
  if (pathname === "/detections") return "탐지 게시글";
  if (pathname.startsWith("/detections/")) return "탐지 게시글 상세";
  if (pathname === "/monitoring") return "크롤링 모니터링";
  if (pathname === "/settings/detection") return "탐지 설정";
  if (pathname === "/settings/account/password") return "비밀번호 변경";
  if (pathname === "/settings/account") return "계정 관리";
  return "대시보드";
}

export function ConsoleShell({ children, memberInfo }: { children: ReactNode; memberInfo: ReactNode }) {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><i />SENTINEL</Link>
        <nav aria-label="콘솔 메뉴" className={styles.nav}>
          <p>모니터링</p>
          <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard aria-hidden="true" />대시보드</Link>
          <Link href="/analyze" aria-current={pathname === "/analyze" ? "page" : undefined}><ScanText aria-hidden="true" />단순 분석</Link>
          <Link href="/detections" aria-current={pathname.startsWith("/detections") ? "page" : undefined}><TriangleAlert aria-hidden="true" />탐지 게시글</Link>
          <Link href="/monitoring" aria-current={pathname === "/monitoring" ? "page" : undefined}><Radar aria-hidden="true" />크롤링 모니터링</Link>
          <p>설정</p>
          <Link href="/settings/detection" aria-current={pathname === "/settings/detection" ? "page" : undefined}><SlidersHorizontal aria-hidden="true" />탐지 설정</Link>
          <Link href="/settings/account" aria-current={pathname.startsWith("/settings/account") ? "page" : undefined}><UserCog aria-hidden="true" />계정 관리</Link>
        </nav>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}><strong>{title}</strong><div className={styles.memberInfo}>{memberInfo}</div></header>
        {children}
      </div>
    </div>
  );
}
