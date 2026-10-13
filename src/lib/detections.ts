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
  /** 텍스트 AI가 마약 관련으로 판정(prediction=1)했는지 */
  flagged: boolean;
  /** 마약일 확률 0~1 */
  probDrug: number;
  matchedTerms: string[];
  matchedIntents: string[];
};

export type DetectionRow = {
  id: string;
  score: number;
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
 * 점수를 min~1 구간에서 초록(min)→노랑→빨강(1.0)으로 연속 매핑한 색상.
 * min 미만은 초록으로 고정된다. 탐지 게시글은 점수가 대부분 0.5 이상이라 기본 min이 0.5이고,
 * 단순 분석처럼 0~1 전체를 쓰는 화면은 min=0을 넘긴다.
 * fg는 글자, bg는 배지 배경, border는 배지 테두리, stroke는 게이지 선 색.
 */
export function scoreColors(score: number, min = 0.5) {
  const t = Math.min(1, Math.max(0, (score - min) / (1 - min)));
  const hue = Math.round(140 * (1 - t));
  return {
    fg: `hsl(${hue} 78% 34%)`,
    bg: `hsl(${hue} 85% 94%)`,
    border: `hsl(${hue} 65% 72%)`,
    stroke: `hsl(${hue} 80% 44%)`,
  };
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
