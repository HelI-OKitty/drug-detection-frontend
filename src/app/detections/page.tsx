import type { Metadata } from "next";
import Link from "next/link";
import { ConsoleShell } from "@/components/console-shell";
import DetectionList from "@/components/detection-list";
import MemberInfo from "@/components/member-info";
import { fetchDetections } from "@/lib/detections-api";
import guardStyles from "@/components/settings.module.css";

export const metadata: Metadata = { title: "탐지 게시글 목록 | SENTINEL" };

export default async function DetectionsPage() {
  const result = await fetchDetections();

  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main>
        {result.ok ? (
          <DetectionList items={result.items} />
        ) : (
          <div className={guardStyles.page}>
            <div className={guardStyles.guard} role="status">
              {result.reason === "unauthorized" ? (
                <>
                  <p>탐지 게시글을 보려면 로그인이 필요합니다.</p>
                  <Link href="/login">로그인하러 가기</Link>
                </>
              ) : (
                <p>탐지 게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </ConsoleShell>
  );
}
