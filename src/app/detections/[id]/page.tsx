import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsoleShell } from "@/components/console-shell";
import DetectionDetail from "@/components/detection-detail";
import MemberInfo from "@/components/member-info";
import { fetchDetectionDetail, markDetectionReviewing } from "@/lib/detections-api";
import guardStyles from "@/components/settings.module.css";

export const metadata: Metadata = { title: "탐지 게시글 상세 | SENTINEL" };

export default async function DetectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchDetectionDetail(id);
  if (!result.ok && result.reason === "notfound") notFound();

  // 상세를 열람한 미확인 게시글은 '검토중'으로 전환한다. (확정/삭제 전까지의 중간 상태)
  let detection = result.ok ? result.detection : null;
  if (detection && detection.status === "unreviewed" && (await markDetectionReviewing(id))) {
    detection = { ...detection, status: "reviewing" };
  }

  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main>
        {detection ? (
          <DetectionDetail detection={detection} />
        ) : (
          <div className={guardStyles.page}>
            <div className={guardStyles.guard} role="status">
              {!result.ok && result.reason === "unauthorized" ? (
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
