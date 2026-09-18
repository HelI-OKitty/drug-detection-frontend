import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console-shell";
import DashboardView from "@/components/dashboard-view";
import MemberInfo from "@/components/member-info";

export const metadata: Metadata = { title: "탐지 대시보드 | SENTINEL" };

export default function DashboardPage() {
  return <ConsoleShell memberInfo={<MemberInfo />}><main><DashboardView /></main></ConsoleShell>;
}
