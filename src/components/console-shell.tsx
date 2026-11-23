"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Radar, ScanText, SlidersHorizontal, TriangleAlert, UserCog } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sentinel:sidebar-collapsed") === "true");
    } catch { /* Keep navigation usable when storage is unavailable. */ }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sentinel:sidebar-collapsed", String(next));
    } catch { /* The toggle still works without persistence. */ }
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside id="console-sidebar" className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
        <Link href="/" className={styles.brand} aria-label="SENTINEL 홈"><i /><span>SENTINEL</span></Link>
          <button type="button" className={styles.sidebarToggle} onClick={toggleSidebar}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            aria-expanded={!collapsed} aria-controls="console-navigation">
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>
        <nav id="console-navigation" aria-label="콘솔 메뉴" className={styles.nav}>
          <p>모니터링</p>
          <Link href="/dashboard" aria-label="대시보드" title={collapsed ? "대시보드" : undefined} aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard aria-hidden="true" /><span>대시보드</span></Link>
          <Link href="/analyze" aria-label="단순 분석" title={collapsed ? "단순 분석" : undefined} aria-current={pathname === "/analyze" ? "page" : undefined}><ScanText aria-hidden="true" /><span>단순 분석</span></Link>
          <Link href="/detections" aria-label="탐지 게시글" title={collapsed ? "탐지 게시글" : undefined} aria-current={pathname.startsWith("/detections") ? "page" : undefined}><TriangleAlert aria-hidden="true" /><span>탐지 게시글</span></Link>
          <Link href="/monitoring" aria-label="크롤링 모니터링" title={collapsed ? "크롤링 모니터링" : undefined} aria-current={pathname === "/monitoring" ? "page" : undefined}><Radar aria-hidden="true" /><span>크롤링 모니터링</span></Link>
          <p>설정</p>
          <Link href="/settings/detection" aria-label="탐지 설정" title={collapsed ? "탐지 설정" : undefined} aria-current={pathname === "/settings/detection" ? "page" : undefined}><SlidersHorizontal aria-hidden="true" /><span>탐지 설정</span></Link>
          <Link href="/settings/account" aria-label="계정 관리" title={collapsed ? "계정 관리" : undefined} aria-current={pathname.startsWith("/settings/account") ? "page" : undefined}><UserCog aria-hidden="true" /><span>계정 관리</span></Link>
        </nav>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <strong>{title}</strong><div className={styles.memberInfo}>{memberInfo}</div></header>
        {children}
      </div>
    </div>
  );
}
