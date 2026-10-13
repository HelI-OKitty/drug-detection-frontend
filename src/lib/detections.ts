// 탐지 게시글 화면에서 함께 쓰는 타입과 표시용 헬퍼. 서버 연동은 detections-api.ts 참고.

/** 백엔드 review_status 값 */
export type ReviewStatus = "unreviewed" | "reviewing" | "confirmed";

/** 이미지에서 탐지된 객체(class_name + confidence) */
export type DetectedObject = {
  name: string;
  confidence: number;
};

export type DetectionImage = {
  url: string;
  /** 이미지 AI가 마약 관련으로 판정(prediction=1)했는지 */
  flagged: boolean;
  score: number;
  detectedObjects: DetectedObject[];
  ocrText: string;
};

/** 백엔드 text_ai_result에서 화면에 쓰는 값만 추린 것 */
export type TextAnalysis = {
  /** 종합 의심 판정(prediction=1). 모델·규칙 어느 쪽이든 의심이면 1 */
  flagged: boolean;
  /**
   * ML 모델의 마약 확률 0~1. 모델 점수 없이 규칙 매칭만 수행된 경우 null.
   * 규칙 양성을 임의의 확률(100%)로 바꿔 보여주지 않는다.
   */
  probDrug: number | null;
  /** 단어 사전과 매칭된 용어 (규칙 결과) */
  matchedTerms: string[];
  /** 동사(의도) 사전과 매칭된 표현 (규칙 결과) */
  matchedIntents: string[];
};

/** 목록 표시용 이미지 1장의 분석 요약 */
export type ImageAnalysisSummary = {
  /** 이미지 URL. 썸네일 표시용 (없으면 빈 문자열) */
  url: string;
  /** 이미지 AI의 의심 판정(prediction=1) */
  flagged: boolean;
  /** 검출된 객체들(이름 + 객체별 confidence) */
  objects: DetectedObject[];
  /** OCR 텍스트 분석 점수 0~1. 추출된 텍스트가 없으면 null */
  ocrScore: number | null;
};

export type DetectionRow = {
  id: string;
  score: number;
  /** 텍스트 AI 모델의 마약 확률(0~1). 모델 점수가 없으면 null */
  textScore: number | null;
  /** 텍스트 분석의 종합 의심 판정. 분석 자체가 없으면 null */
  textFlagged: boolean | null;
  /** 이미지별 분석 요약. 이미지가 없으면 빈 배열 */
  imageAnalyses: ImageAnalysisSummary[];
  /** 목록에 보여줄 한 줄 요약 */
  summary: string;
  nickname: string;
  platform: string;
  sourceUrl: string;
  detectedAt: string;
  status: ReviewStatus;
  keywords: string[];
};

export type DetectionDetailData = DetectionRow & {
  /** 상세에 보여줄 본문 전문 */
  content: string;
  postedAt: string;
  images: DetectionImage[];
  /** 텍스트 분석을 돌리지 않은 게시글이면 null */
  textAnalysis: TextAnalysis | null;
};

/** 0~1 점수를 "92%" 형태의 비율 문자열로 바꾼다. */
export function toPercent(score: number) {
  return `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;
}

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  unreviewed: "미확인",
  reviewing: "검토중",
  confirmed: "확정",
};

export const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "unreviewed", label: "미확인" },
  { key: "reviewing", label: "검토중" },
  { key: "confirmed", label: "확정" },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

/**
 * 위험도 색상. 그라데이션 대신 3구간으로 나눠 높은 위험이 중간 색에 묻히지 않게 한다.
 * low(0.5 미만) 회색 · mid(0.5~0.9) 주황 · high(0.9 이상) 빨강.
 * fg는 글자, bg는 배지 배경, border는 배지 테두리, stroke는 게이지·바 색.
 */
export function scoreColors(score: number) {
  if (score >= 0.9) return { fg: "#cf2548", bg: "#fde8ec", border: "#f3c0cc", stroke: "#e11d48" };
  if (score >= 0.5) return { fg: "#c2690a", bg: "#fdf0dd", border: "#f3d9a9", stroke: "#f59e0b" };
  return { fg: "#5b6b7d", bg: "#f1f5f9", border: "#e2e8f0", stroke: "#94a3b8" };
}

/** source_url에서 표시용 호스트만 뽑는다. 잘못된 URL이면 원본을 그대로 돌려준다. */
export function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 상세 메타데이터에 보여줄 축약 URL. x.com/…/0712 형태. */
export function shortUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    const last = pathname.split("/").filter(Boolean).pop();
    return last ? `${hostname.replace(/^www\./, "")}/…/${last}` : hostname;
  } catch {
    return url;
  }
}
