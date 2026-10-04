// POST /public/analyze 호출. 텍스트·이미지(base64) 단건 분석을 담당하며
// 브라우저와 서버 어디서든 쓸 수 있도록 fetch만 사용한다.

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

export type AnalyzedObject = { className: string; confidence: number };

export interface AnalyzeResult {
  isDrug: boolean;
  /** 이미지 분석 시 탐지된 객체 목록 */
  detectedObjects: AnalyzedObject[];
  /** 이미지에서 추출된 OCR 텍스트 */
  ocrText: string | null;
  /** 텍스트 마약 확률 (0~1) */
  probDrug: number | null;
}

export async function analyzeContent(payload: { text?: string; image?: string }): Promise<AnalyzeResult> {
  const body: Record<string, string> = {};
  const text = payload.text?.trim();
  if (text) body.text = text;
  if (payload.image) body.image = payload.image;
  if (Object.keys(body).length === 0) throw new Error("분석할 텍스트나 이미지를 입력해 주세요.");

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || DEFAULT_API_URL;
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/public/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw new Error("분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw new Error("분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (response.status === 429) throw new Error("요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  if (response.status === 413) throw new Error("이미지 용량이 너무 큽니다. 더 작은 이미지로 시도해 주세요.");
  if (response.status === 422) throw new Error("분석할 내용을 확인해 주세요.");
  if (!response.ok) throw new Error("분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || !("is_drug" in data) || typeof data.is_drug !== "boolean") {
    throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
  }
  const raw = data as Record<string, unknown>;
  const objects = Array.isArray(raw.detected_objects)
    ? raw.detected_objects.flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const object = item as Record<string, unknown>;
        if (typeof object.class_name !== "string" || typeof object.confidence !== "number") return [];
        return [{ className: object.class_name, confidence: object.confidence }];
      })
    : [];
  return {
    isDrug: raw.is_drug === true,
    detectedObjects: objects,
    ocrText: typeof raw.ocr_text === "string" && raw.ocr_text.trim() ? raw.ocr_text : null,
    probDrug: typeof raw.prob_drug === "number" ? raw.prob_drug : null,
  };
}

/** 텍스트 단건 분석. 기존 호출부·테스트 호환용 래퍼. */
export async function analyzeText(text: unknown): Promise<{ is_drug: boolean }> {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("분석할 텍스트를 입력해 주세요.");
  }
  const result = await analyzeContent({ text });
  return { is_drug: result.isDrug };
}
