// GET /detections, GET /detections/{id}, GET /dashboard/* 서버 연동. 화면용 타입으로 변환해서 돌려준다.

import { cookies } from "next/headers";
import type { DetectedObject, DetectionDetailData, DetectionImage, DetectionRow, ReviewStatus, TextAnalysis } from "./detections";

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";
const REVIEW_STATUSES: ReviewStatus[] = ["unreviewed", "reviewing", "confirmed"];

const PLATFORM_LABEL: Record<string, string> = {
  x: "X (Twitter)",
  twitter: "X (Twitter)",
  instagram: "Instagram",
};

/** ISO 일시를 KST 기준 "YYYY-MM-DD HH:mm"으로 맞춘다. */
function formatDateTime(iso: unknown) {
  if (typeof iso !== "string") return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * TODO(mock): 목록 응답이 개별 분석 결과(text_ai_result/image_ai_results)를 내려주기 전까지
 * id 기반 고정 mock 스코어로 채운다. API가 실제 값을 주면 이 함수와 호출부 fallback을 제거한다.
 */
function mockScore(id: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return hash / 997;
}

/** TODO(mock): 검출 객체 이름 mock 풀. 실제 class_name이 내려오면 제거. */
const MOCK_OBJECTS = ["알약", "주사기", "대마초", "흰 가루", "지퍼백"];

function toRow(raw: Record<string, unknown>): DetectionRow | null {
  if (typeof raw.id !== "string" || typeof raw.content !== "string") return null;
  const id = raw.id;
  const platform = typeof raw.platform === "string" ? raw.platform : "";
  const author = typeof raw.author_id === "string" ? raw.author_id : "";
  const status = REVIEW_STATUSES.includes(raw.review_status as ReviewStatus)
    ? (raw.review_status as ReviewStatus)
    : "unreviewed";
  const textAnalysis = toTextAnalysis(raw.text_ai_result);
  const images = toImages(raw.image_ai_results);
  let imageAnalyses = images.map((image, index) => ({
    url: image.url,
    flagged: image.flagged,
    objects: image.detectedObjects,
    // OCR 텍스트별 분석 점수는 백엔드가 아직 안 내려줘서 ocr_text가 있는 이미지에 mock 점수를 부여한다.
    ocrScore: image.ocrText ? mockScore(id, 31 + index) : null,
  }));
  if (images.length === 0) {
    // mock 분포: 일부 행은 이미지 없음(빈 배열), 나머지는 1~4장. 객체 0~2개(각자 confidence), OCR은 일부만.
    const count = mockScore(id, 13) > 0.75 ? 0 : 1 + Math.floor(mockScore(id, 29) * 4);
    imageAnalyses = Array.from({ length: count }, (_, index) => {
      const objectCount = Math.floor(mockScore(id, 71 + index) * 3);
      const names = Array.from(
        new Set(Array.from({ length: objectCount }, (_, j) => MOCK_OBJECTS[(id.length + index * 2 + j) % MOCK_OBJECTS.length])),
      );
      const ocr = mockScore(id, 59 + index);
      return {
        url: "",
        flagged: mockScore(id, 97 + index) >= 0.5,
        objects: names.map((name, j) => ({ name, confidence: mockScore(id, 83 + index * 3 + j) })),
        ocrScore: ocr > 0.8 ? null : ocr,
      };
    });
  }
  return {
    id,
    score: typeof raw.score === "number" ? raw.score : 0,
    textScore: textAnalysis ? textAnalysis.probDrug : mockScore(id, 7),
    textFlagged: textAnalysis ? textAnalysis.flagged : mockScore(id, 7) >= 0.5,
    imageAnalyses,
    summary: raw.content.replace(/\s+/g, " ").trim().slice(0, 80) || "(내용 없음)",
    nickname: author ? (author.startsWith("@") ? author : `@${author}`) : "(작성자 미상)",
    platform: PLATFORM_LABEL[platform.toLowerCase()] ?? platform,
    sourceUrl: typeof raw.source_url === "string" ? raw.source_url : "",
    detectedAt: formatDateTime(raw.detected_at),
    status,
    keywords: Array.isArray(raw.keyword) ? raw.keyword.filter((word): word is string => typeof word === "string") : [],
  };
}

function toDetectedObjects(raw: unknown): DetectedObject[] {
  if (!Array.isArray(raw)) return [];
  const objects = raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const object = item as Record<string, unknown>;
    if (typeof object.class_name !== "string" || !object.class_name) return [];
    return [{
      name: object.class_name,
      confidence: typeof object.confidence === "number" ? object.confidence : 0,
    }];
  });
  // 확신도 높은 객체가 먼저 보이도록 정렬
  return objects.sort((a, b) => b.confidence - a.confidence);
}

function toImages(raw: unknown): DetectionImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const image = item as Record<string, unknown>;
    if (typeof image.image_url !== "string" || !image.image_url) return [];
    return [{
      url: image.image_url,
      flagged: image.prediction === 1,
      score: typeof image.image_score === "number" ? image.image_score : 0,
      detectedObjects: toDetectedObjects(image.detected_objects),
      ocrText: typeof image.ocr_text === "string" ? image.ocr_text.trim() : "",
    }];
  });
}

function toStringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((word): word is string => typeof word === "string" && word.length > 0) : [];
}

function toTextAnalysis(raw: unknown): TextAnalysis | null {
  if (typeof raw !== "object" || raw === null) return null;
  const text = raw as Record<string, unknown>;
  return {
    flagged: text.prediction === 1,
    // prob_drug는 모델 점수라 없을 수 있다. 규칙 양성(prediction=1)을 확률로 둔갑시키지 않는다.
    probDrug: typeof text.prob_drug === "number" ? text.prob_drug : null,
    matchedTerms: toStringList(text.matched_terms),
    matchedIntents: toStringList(text.matched_intents),
  };
}

async function request(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (!token) return { status: 401 as const, data: null };
  const baseUrl = process.env.BACKEND_API_URL || DEFAULT_API_URL;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, data: response.ok ? await response.json() : null };
}

/** 관리자가 상세를 열람하면 미확인 게시글을 '검토중'으로 올린다. 실패해도 화면은 그대로 둔다. */
export async function markDetectionReviewing(id: string): Promise<boolean> {
  try {
    const { status } = await request(`/detections/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ review_status: "reviewing" }),
    });
    return status >= 200 && status < 300;
  } catch {
    return false;
  }
}

export type DetectionsResult =
  | { ok: true; items: DetectionRow[] }
  | { ok: false; reason: "unauthorized" | "error" };

export async function fetchDetections(): Promise<DetectionsResult> {
  try {
    const { status, data } = await request("/detections");
    if (status === 401 || status === 403) return { ok: false, reason: "unauthorized" };
    if (!Array.isArray(data)) return { ok: false, reason: "error" };
    const items = data.flatMap((item) => {
      const row = typeof item === "object" && item !== null ? toRow(item as Record<string, unknown>) : null;
      return row ? [row] : [];
    });
    return { ok: true, items };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type DashboardSummary = {
  total: number;
  today: number;
  unconfirmed: number;
  trend: { date: string; count: number }[];
};

export type DashboardResult =
  | { ok: true; summary: DashboardSummary; recent: DetectionRow[] }
  | { ok: false; reason: "unauthorized" | "error" };

const EMPTY_SUMMARY: DashboardSummary = { total: 0, today: 0, unconfirmed: 0, trend: [] };

function toCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * 응답이 비거나 일부 요청이 실패해도 기본값(0·빈 목록)으로 채워 항상 대시보드를 그린다.
 * 로그인 문제(401/403)일 때만 실패로 처리한다.
 */
export async function fetchDashboard(): Promise<DashboardResult> {
  const fallback = { status: 0, data: null as unknown };
  const [summaryRes, recentRes] = await Promise.all([
    request("/dashboard/summary").catch(() => fallback),
    request("/dashboard/recent?limit=5").catch(() => fallback),
  ]);
  if ([summaryRes.status, recentRes.status].some((status) => status === 401 || status === 403)) {
    return { ok: false, reason: "unauthorized" };
  }

  const summaryRaw = (
    typeof summaryRes.data === "object" && summaryRes.data !== null ? summaryRes.data : {}
  ) as Record<string, unknown>;
  const trend = Array.isArray(summaryRaw.trend)
    ? summaryRaw.trend.flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const day = item as Record<string, unknown>;
        if (typeof day.date !== "string") return [];
        return [{ date: day.date, count: toCount(day.count) }];
      })
    : [];
  const summary: DashboardSummary = {
    ...EMPTY_SUMMARY,
    total: toCount(summaryRaw.total),
    today: toCount(summaryRaw.today),
    unconfirmed: toCount(summaryRaw.unconfirmed),
    trend,
  };
  const recent = Array.isArray(recentRes.data)
    ? recentRes.data.flatMap((item: unknown) => {
        const row = typeof item === "object" && item !== null ? toRow(item as Record<string, unknown>) : null;
        return row ? [row] : [];
      })
    : [];
  return { ok: true, summary, recent };
}

export type DetectionDetailResult =
  | { ok: true; detection: DetectionDetailData }
  | { ok: false; reason: "unauthorized" | "notfound" | "error" };

export async function fetchDetectionDetail(id: string): Promise<DetectionDetailResult> {
  try {
    const { status, data } = await request(`/detections/${encodeURIComponent(id)}`);
    if (status === 401 || status === 403) return { ok: false, reason: "unauthorized" };
    if (status === 404 || status === 422) return { ok: false, reason: "notfound" };
    if (typeof data !== "object" || data === null) return { ok: false, reason: "error" };
    const raw = data as Record<string, unknown>;
    const row = toRow(raw);
    if (!row) return { ok: false, reason: "error" };
    return {
      ok: true,
      detection: {
        ...row,
        content: String(raw.content ?? ""),
        postedAt: formatDateTime(raw.created_at_source),
        images: toImages(raw.image_ai_results),
        textAnalysis: toTextAnalysis(raw.text_ai_result),
      },
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}
