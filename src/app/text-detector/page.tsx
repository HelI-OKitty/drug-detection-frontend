import type { Metadata } from "next";
import TextDetectorForm from "@/components/text-detector-form";
import { ConsoleShell } from "@/components/console-shell";
import MemberInfo from "@/components/member-info";

export const metadata: Metadata = { title: "텍스트 분석 | SENTINEL" };

export default function TextDetectorPage() {
  return <ConsoleShell memberInfo={<MemberInfo />}><TextDetectorForm /></ConsoleShell>;
}
