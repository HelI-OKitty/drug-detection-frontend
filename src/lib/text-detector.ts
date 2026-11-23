// 단순 분석: 텍스트와 이미지 배열을 한 요청으로 보내고 서버의 종합·개별 판정을 보존한다.
const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

export const MAX_ANALYZE_IMAGES = 5;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
// 이미지 5장의 base64 인코딩 크기에 텍스트·JSON 여유 1MB를 더한다.
export const MAX_ANALYZE_BODY_BYTES = MAX_ANALYZE_IMAGES * Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 1024 * 1024;
export type AnalyzePayload = { text?: string; images?: string[] };
export type AnalyzedObject = { className: string; confidence: number | null };
/** 판정 방식. no_supported_characters는 텍스트 모델이 분석할 수 없는 입력을 뜻한다. */
export type AnalysisSource = "rule" | "model" | "no_supported_characters" | null;
export type TextAnalyzeResult = {
  isDrug: boolean | null;
  source: AnalysisSource;
  /** text_score(0~100)를 화면 공통 단위(0~1)로 변환. rule·no_supported_characters는 null */
  score: number | null;
  matchedTerms: string[];
  matchedIntents: string[];
};
export type OcrAnalyzeResult = {
  text: string;
  isDrug: boolean | null;
  source: AnalysisSource;
  score: number | null;
  matchedTerms: string[];
  matchedIntents: string[];
};
export type ImageAnalyzeResult = {
  isDrug: boolean;
  score: number | null;
  detectedObjects: AnalyzedObject[];
  ocrText: string;
  ocrResults: OcrAnalyzeResult[];
};
export type AnalyzeResult = {
  isDrug: boolean;
  textResult: TextAnalyzeResult | null;
  imageResults: ImageAnalyzeResult[];
};

/** 클라이언트와 프록시가 같은 요청 계약을 사용한다. */
export function prepareAnalyzeRequest(input: unknown): { body: AnalyzePayload; error?: never; status?: never } | { error: string; status: number; body?: never } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "분석할 내용을 확인해 주세요.", status: 422 };
  const raw = input as Record<string, unknown>;
  if (raw.text !== undefined && typeof raw.text !== "string") return { error: "텍스트는 문자열로 입력해 주세요.", status: 422 };
  if (raw.images !== undefined && (!Array.isArray(raw.images) || raw.images.some((item) => typeof item !== "string" || !item.trim()))) {
    return { error: "이미지는 base64 문자열 목록으로 보내 주세요.", status: 422 };
  }
  if (Array.isArray(raw.images)) {
    if (raw.images.length > MAX_ANALYZE_IMAGES) return { error: "이미지는 최대 5장까지 추가할 수 있습니다.", status: 422 };
    for (const image of raw.images as string[]) {
      const base64 = image.replace(/\s/g, "");
      const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
      if (Math.floor(base64.length * 3 / 4) - padding > MAX_IMAGE_BYTES) {
        return { error: "이미지는 파일당 3MB 이하로 추가해 주세요.", status: 413 };
      }
    }
  }
  const body: AnalyzePayload = {};
  if (typeof raw.text === "string" && raw.text.trim()) body.text = raw.text.trim();
  if (Array.isArray(raw.images) && raw.images.length) body.images = raw.images as string[];
  if (!body.text && !body.images?.length) return { error: "분석할 텍스트나 이미지를 입력해 주세요.", status: 422 };
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_ANALYZE_BODY_BYTES) {
    return { error: "입력 용량이 큽니다. 텍스트를 줄이거나 이미지 크기·개수를 줄여 주세요.", status: 413 };
  }
  return { body };
}
function probability(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value / max : null;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
  return value as Record<string, unknown>;
}
function prediction(value: unknown) {
  if (value !== 0 && value !== 1) throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
  return value === 1;
}
function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
function parseSource(value: unknown): AnalysisSource {
  return value === "rule" || value === "model" || value === "no_supported_characters" ? value : null;
}
export async function analyzeContent(payload: AnalyzePayload): Promise<AnalyzeResult> {
  const prepared = prepareAnalyzeRequest(payload);
  if (prepared.error !== undefined) throw new Error(prepared.error);
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || DEFAULT_API_URL;
  const endpoint = typeof window === "undefined" ? `${baseUrl.replace(/\/$/, "")}/public/analyze` : "/api/analyze";
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prepared.body),
      cache: "no-store", signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) throw new Error("분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    throw new Error("분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (response.status === 429) throw new Error("요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  if (response.status === 413) throw new Error("입력 용량이 큽니다. 텍스트를 줄이거나 이미지 크기·개수를 줄여 주세요.");
  if (response.status === 422) throw new Error("분석할 내용을 확인해 주세요.");
  if (response.status === 504) throw new Error("분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
  if (!response.ok) throw new Error("분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const raw = record(await response.json().catch(() => null));
  if (typeof raw.is_drug !== "boolean" || !Array.isArray(raw.image_ai_results) || raw.text_ai_result === undefined) {
    throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
  }
  const requestedImages = prepared.body.images?.length ?? 0;
  if (raw.image_ai_results.length !== requestedImages) {
    throw new Error(`이미지 ${requestedImages}장을 전송했지만 서버에서 ${raw.image_ai_results.length}건의 분석 결과만 받았습니다. 이미지 분석 결과가 누락되어 판정을 표시할 수 없습니다. 잠시 후 다시 시도해 주세요.`);
  }
  let textResult: TextAnalyzeResult | null = null;
  if (raw.text_ai_result !== null) {
    const text = record(raw.text_ai_result);
    const source = parseSource(text.source);
    // 모델이 처리할 수 없는 입력은 판정·점수·매칭이 없다. 빈 응답({})과 달리 source로 식별한다.
    textResult = source === "no_supported_characters"
      ? { isDrug: null, source, score: null, matchedTerms: [], matchedIntents: [] }
      : {
          isDrug: text.prediction === null ? null : prediction(text.prediction),
          source,
          score: probability(text.text_score, 100),
          matchedTerms: strings(text.matched_terms), matchedIntents: strings(text.matched_intents),
        };
  }
  const imageResults = raw.image_ai_results.map((item) => {
    const image = record(item);
    if (!Array.isArray(image.detected_objects) || (image.ocr_text_results !== undefined
      ? !Array.isArray(image.ocr_text_results) : typeof image.ocr_text !== "string")) {
      throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
    }
    const ocrResults = Array.isArray(image.ocr_text_results) ? image.ocr_text_results.map((item) => {
      const ocr = record(item);
      if (typeof ocr.ocr_text !== "string") throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
      const source = parseSource(ocr.source);
      // OCR도 텍스트와 동일한 응답 구조를 쓴다. 분석 불가 입력은 판정·점수·매칭 없이 추출 문구만 남긴다.
      return source === "no_supported_characters"
        ? { text: ocr.ocr_text, isDrug: null, source, score: null, matchedTerms: [], matchedIntents: [] }
        : {
            text: ocr.ocr_text, isDrug: ocr.prediction === null ? null : prediction(ocr.prediction),
            source, score: probability(ocr.ocr_text_score, 100),
            matchedTerms: strings(ocr.matched_terms), matchedIntents: strings(ocr.matched_intents),
          };
    }) : [];
    return {
      isDrug: prediction(image.prediction), score: probability(image.image_score, 1),
      ocrText: typeof image.ocr_text === "string" ? image.ocr_text : "", ocrResults,
      detectedObjects: image.detected_objects.map((item) => {
        const object = record(item);
        if (typeof object.class_name !== "string") throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
        return { className: object.class_name, confidence: probability(object.confidence, 1) };
      }),
    };
  });
  return { isDrug: raw.is_drug, textResult, imageResults };
}
export async function analyzeText(text: unknown): Promise<{ is_drug: boolean }> {
  if (typeof text !== "string" || !text.trim()) throw new Error("분석할 텍스트를 입력해 주세요.");
  return { is_drug: (await analyzeContent({ text })).isDrug };
}
