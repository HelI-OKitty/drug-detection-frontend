// 탐지 게시글 화면에서 함께 쓰는 타입과 표시용 헬퍼. 서버 연동은 detections-api.ts 참고.

/** 백엔드 review_status 값 */
export type ReviewStatus = "unreviewed" | "reviewing" | "confirmed";

export type DetectionImage = {
  url: string;
  /** 이미지 AI가 마약 관련으로 판정(prediction=1)했는지 */
  flagged: boolean;
  score: number;
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
};

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

export type RiskBand = "high" | "mid" | "low";

export function riskBand(score: number): RiskBand {
  if (score >= 0.85) return "high";
  if (score >= 0.8) return "mid";
  return "low";
}

export const RISK_LABEL: Record<RiskBand, string> = {
  high: "HIGH RISK",
  mid: "MEDIUM RISK",
  low: "LOW RISK",
};

/**
 * 점수를 0.5~1 구간에서 초록(0.5)→노랑(0.75)→빨강(1.0)으로 연속 매핑한 색상.
 * 0.5 미만은 초록으로 고정된다. fg는 글자, bg는 배지 배경, border는 배지 테두리, stroke는 게이지 선 색.
 */
export function scoreColors(score: number) {
  const t = Math.min(1, Math.max(0, (score - 0.5) / 0.5));
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
