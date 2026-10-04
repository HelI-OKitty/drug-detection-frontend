import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console-shell";
import DetectionSettings from "@/components/detection-settings";
import MemberInfo from "@/components/member-info";
import RequireAuth from "@/components/require-auth";

export const metadata: Metadata = { title: "탐지 설정 | SENTINEL" };

export default function DetectionSettingsPage() {
  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main><RequireAuth><DetectionSettings /></RequireAuth></main>
    </ConsoleShell>
  );
}
