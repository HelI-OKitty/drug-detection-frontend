import type { Metadata } from "next";
import AnalyzeForm from "@/components/analyze-form";
import { ConsoleShell } from "@/components/console-shell";
import MemberInfo from "@/components/member-info";
import RequireAuth from "@/components/require-auth";

export const metadata: Metadata = { title: "단순 분석 | SENTINEL" };

export default function AnalyzePage() {
  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main><RequireAuth><AnalyzeForm /></RequireAuth></main>
    </ConsoleShell>
  );
}
