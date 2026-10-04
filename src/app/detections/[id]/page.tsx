import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConsoleShell } from "@/components/console-shell";
import DetectionDetail from "@/components/detection-detail";
import MemberInfo from "@/components/member-info";
import { detections, findDetection } from "@/lib/detections-sample";

export function generateStaticParams() {
  return detections.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detection = findDetection(id);
  return { title: detection ? `${detection.nickname} 탐지 상세 | SENTINEL` : "탐지 게시글 상세 | SENTINEL" };
}

export default async function DetectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detection = findDetection(id);
  if (!detection) notFound();

  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main><DetectionDetail detection={detection} /></main>
    </ConsoleShell>
  );
}
