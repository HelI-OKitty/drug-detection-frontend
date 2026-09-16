import type { Metadata } from "next";
import TextDetectorForm from "@/components/text-detector-form";

export const metadata: Metadata = { title: "텍스트 분석 | SENTINEL" };

export default function TextDetectorPage() {
  return <TextDetectorForm />;
}
