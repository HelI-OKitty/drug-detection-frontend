"use server";

import { analyzeText } from "@/lib/text-detector";

export async function detectText(text: string) {
  try {
    const result = await analyzeText(text);
    return { success: true as const, isDrug: result.is_drug };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.",
    };
  }
}
