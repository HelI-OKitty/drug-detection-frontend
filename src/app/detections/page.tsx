import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console-shell";
import DetectionList from "@/components/detection-list";
import MemberInfo from "@/components/member-info";

export const metadata: Metadata = { title: "탐지 게시글 목록 | SENTINEL" };

export default function DetectionsPage() {
  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main><DetectionList /></main>
    </ConsoleShell>
  );
}
