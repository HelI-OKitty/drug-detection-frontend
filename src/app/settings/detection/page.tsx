import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console-shell";
import DetectionSettings from "@/components/detection-settings";
import MemberInfo from "@/components/member-info";
import RequireAuth from "@/components/require-auth";
import { fetchCrawlSettings } from "./actions";

export const metadata: Metadata = { title: "탐지 설정 | SENTINEL" };

export default async function DetectionSettingsPage() {
  const result = await fetchCrawlSettings();
  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main>
        <RequireAuth>
          <DetectionSettings initial={result.success ? result.settings : null} />
        </RequireAuth>
      </main>
    </ConsoleShell>
  );
}
