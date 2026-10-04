import type { Metadata } from "next";
import Link from "next/link";
import { ConsoleShell } from "@/components/console-shell";
import DashboardView from "@/components/dashboard-view";
import MemberInfo from "@/components/member-info";
import { fetchDashboard } from "@/lib/detections-api";
import guardStyles from "@/components/settings.module.css";

export const metadata: Metadata = { title: "탐지 대시보드 | SENTINEL" };

export default async function DashboardPage() {
  const result = await fetchDashboard();

  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main>
        {result.ok ? (
          <DashboardView summary={result.summary} recent={result.recent} />
        ) : (
          <div className={guardStyles.page}>
            <div className={guardStyles.guard} role="status">
              {result.reason === "unauthorized" ? (
                <>
                  <p>대시보드를 보려면 로그인이 필요합니다.</p>
                  <Link href="/login">로그인하러 가기</Link>
                </>
              ) : (
                <p>대시보드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </ConsoleShell>
  );
}
