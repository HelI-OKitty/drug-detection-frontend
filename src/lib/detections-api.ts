// GET /detections, GET /detections/{id}, GET /dashboard/* 서버 연동. 화면용 타입으로 변환해서 돌려준다.

import { cookies } from "next/headers";
import type { DetectedObject, DetectionDetailData, DetectionImage, DetectionRow, ImageAnalysisSummary, ReviewStatus, TextAnalysis } from "./detections";

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

function toRow(raw: Record<string, unknown>): DetectionRow | null {
  if (typeof raw.id !== "string" || typeof raw.content !== "string") return null;
  const id = raw.id;
  const platform = typeof raw.platform === "string" ? raw.platform : "";
  const author = typeof raw.author_id === "string" ? raw.author_id : "";
  const status = REVIEW_STATUSES.includes(raw.review_status as ReviewStatus)
    ? (raw.review_status as ReviewStatus)
    : "unreviewed";
  const textAnalysis = toTextAnalysis(raw.text_ai_result);
  const imageAnalyses = toImageSummaries(raw.image_ai_results);
  const ocrImages = imageAnalyses.filter((image) => image.hasOcrText);
  return {
    id,
    isDrug: typeof raw.is_drug === "boolean" ? raw.is_drug : null,
    ocrFlagged: ocrImages.some((image) => image.ocrFlagged === true) ? true
      : ocrImages.length > 0 && ocrImages.every((image) => image.ocrFlagged === false) ? false : null,
    textSource: textAnalysis?.source ?? null,
    textScore: textAnalysis ? textAnalysis.probDrug : null,
    textFlagged: textAnalysis ? textAnalysis.flagged : null,
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

/**
 * 목록 응답의 이미지 요약(image_ai_results[])을 화면용 요약으로 바꾼다.
 * 목록에는 image_url·detected_objects·ocr_text가 없고 prediction·image_score·has_ocr_text만 내려오므로
 * image_url 유무에 의존하지 않고 prediction으로 판정을 만든다.
 */
function toImageSummaries(raw: unknown): ImageAnalysisSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const image = item as Record<string, unknown>;
    if (image.prediction !== 0 && image.prediction !== 1) return [];
    return [{
      flagged: image.prediction === 1,
      score: typeof image.image_score === "number" ? image.image_score : 0,
      hasOcrText: image.has_ocr_text === true,
      ocrFlagged: image.has_ocr_text === true && typeof image.is_ocr_drug === "boolean" ? image.is_ocr_drug : null,
      ocrScore: null,
    }];
  });
}

function toOcrResults(image: Record<string, unknown>): DetectionImage["ocrResults"] {
  if (!Array.isArray(image.ocr_text_results)) return [];
  return image.ocr_text_results.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const ocr = raw as Record<string, unknown>;
    if (typeof ocr.ocr_text !== "string") return [];
    const analysis = toTextAnalysis({ ...ocr, text_score: ocr.ocr_text_score });
    return analysis ? [{ ...analysis, text: ocr.ocr_text }] : [];
  });
}

function toImages(raw: unknown): DetectionImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const image = item as Record<string, unknown>;
    if (typeof image.image_url !== "string" || !image.image_url) return [];
    const ocrResults = toOcrResults(image);
    return [{
      url: image.image_url,
      flagged: image.prediction === 1,
      score: typeof image.image_score === "number" ? image.image_score : 0,
      detectedObjects: toDetectedObjects(image.detected_objects),
      ocrText: ocrResults.map((ocr) => ocr.text).filter((text) => text.trim()).join("\n"),
      ocrResults,
    }];
  });
}

function toStringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((word): word is string => typeof word === "string" && word.length > 0) : [];
}

function toTextAnalysis(raw: unknown): TextAnalysis | null {
  if (typeof raw !== "object" || raw === null) return null;
  const text = raw as Record<string, unknown>;
  // text_score는 마약 확률 %(0~100). model 판정 시 제공되고 rule 판정 시 null이다.
  const score = typeof text.text_score === "number" && Number.isFinite(text.text_score)
    ? text.text_score / 100 : null;
  return {
    flagged: text.prediction === 1 ? true : text.prediction === 0 ? false : null,
    source: typeof text.source === "string" ? text.source : null,
    // 규칙 양성(prediction=1)을 확률로 둔갑시키지 않는다. 점수는 model 판정일 때만 존재한다.
    probDrug: score !== null && score >= 0 && score <= 1 ? score : null,
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
};

export type DashboardVerdicts = { positive: number; negative: number };
export type DashboardTrend = { date: string; positive: number; negative: number }[];

export type DashboardResult =
  | { ok: true; summary: DashboardSummary; verdicts: DashboardVerdicts }
  | { ok: false; reason: "unauthorized" | "error" };

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function fetchDashboard(): Promise<DashboardResult> {
  try {
    const { status, data } = await request("/dashboard/summary");
    if (status === 401 || status === 403) return { ok: false, reason: "unauthorized" };

    const { total, today, unreviewed, verdict } = asRecord(data);
    const { positive, negative } = asRecord(verdict);
    if (status !== 200 || !isCount(total) || !isCount(today) || !isCount(unreviewed)
      || !isCount(positive) || !isCount(negative)) {
      return { ok: false, reason: "error" };
    }

    return {
      ok: true,
      summary: { total, today, unconfirmed: unreviewed },
      verdicts: { positive, negative },
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export type AnalysisStats = {
  trend: DashboardTrend;
  analyzedText: number;
  textModel: number;
  textRuleOnly: number;
  terms: { name: string; count: number }[];
  intents: { name: string; count: number }[];
  imageTotal: number;
  withOcr: number;
  withoutOcr: number;
  objects: { name: string; count: number }[] | null;
};

function parseCounts(value: unknown, nameKey: string) {
  if (!Array.isArray(value)) return null;
  const counts: { name: string; count: number }[] = [];
  for (const item of value) {
    const { [nameKey]: name, count } = asRecord(item);
    if (typeof name !== "string" || !isCount(count)) return null;
    counts.push({ name, count });
  }
  return counts;
}

async function fetchDashboardAnalytics(): Promise<AnalysisStats | null> {
  try {
    const { status, data } = await request("/dashboard/analytics");
    if (status !== 200) {
      if (status !== 401 && status !== 403) console.warn(`[dashboard] GET /dashboard/analytics returned HTTP ${status}`);
      return null;
    }
    const { trend: rawTrend, text, image } = asRecord(data);
    const { analyzed, top_terms, top_intents, source } = asRecord(text);
    const { model, rule } = asRecord(source);
    const { total_images, ocr_with_text, ocr_without_text, objects: rawObjects } = asRecord(image);
    if (!Array.isArray(rawTrend) || !isCount(analyzed) || !isCount(model)
      || !isCount(rule) || !isCount(total_images) || !isCount(ocr_with_text)
      || !isCount(ocr_without_text)) return null;

    const trend: DashboardTrend = [];
    for (const item of rawTrend) {
      const { date, positive, negative } = asRecord(item);
      if (typeof date !== "string" || !isCount(positive) || !isCount(negative)) return null;
      trend.push({ date, positive, negative });
    }
    const terms = parseCounts(top_terms, "term");
    const intents = parseCounts(top_intents, "intent");
    const objects = parseCounts(rawObjects, "class_name");
    if (!terms || !intents || !objects) return null;

    return {
      trend,
      analyzedText: analyzed,
      textModel: model,
      textRuleOnly: rule,
      terms,
      intents,
      imageTotal: total_images,
      withOcr: ocr_with_text,
      withoutOcr: ocr_without_text,
      objects,
    };
  } catch {
    return null;
  }
}

/** 상세 응답을 요청하지 않고 목록에서 확인할 수 있는 통계만 집계한다. */
async function fetchListAnalysisStats(): Promise<AnalysisStats | null> {
  const { status, data } = await request("/detections");
  if (status !== 200 || !Array.isArray(data)) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const trend: DashboardTrend = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(today.getTime() - (6 - index) * 86_400_000).toISOString().slice(0, 10),
    positive: 0,
    negative: 0,
  }));
  const days = new Map(trend.map((day) => [day.date, day]));
  const stats: AnalysisStats = {
    trend, analyzedText: 0, textModel: 0, textRuleOnly: 0, terms: [], intents: [],
    imageTotal: 0, withOcr: 0, withoutOcr: 0, objects: null,
  };
  const terms = new Map<string, number>();
  const intents = new Map<string, number>();
  const add = (counts: Map<string, number>, names: string[]) => {
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  };

  for (const item of data) {
    const raw = asRecord(item);
    if (typeof raw.is_drug !== "boolean") continue;
    if (typeof raw.detected_at === "string") {
      // Mongo에서 시간대 없이 직렬화한 날짜도 UTC로 저장된다.
      const iso = /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(raw.detected_at)
        ? `${raw.detected_at}Z` : raw.detected_at;
      const detectedAt = new Date(iso);
      const day = Number.isFinite(detectedAt.getTime()) && days.get(detectedAt.toISOString().slice(0, 10));
      if (day) day[raw.is_drug ? "positive" : "negative"]++;
    }
    if (!raw.is_drug) continue;

    const text = toTextAnalysis(raw.text_ai_result);
    if (text) {
      stats.analyzedText++;
      if (text.source === "model") stats.textModel++;
      if (text.source === "rule") stats.textRuleOnly++;
      add(terms, text.matchedTerms);
      add(intents, text.matchedIntents);
    }
    if (!Array.isArray(raw.image_ai_results)) continue;
    for (const item of raw.image_ai_results) {
      const { has_ocr_text } = asRecord(item);
      if (typeof has_ocr_text !== "boolean") continue;
      stats.imageTotal++;
      if (has_ocr_text) stats.withOcr++;
      else stats.withoutOcr++;
    }
  }

  const top = (counts: Map<string, number>) => [...counts]
    .sort(([, a], [, b]) => b - a).slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  return { ...stats, terms: top(terms), intents: top(intents) };
}

export async function fetchAnalysisStats(): Promise<AnalysisStats | null> {
  return await fetchDashboardAnalytics() ?? await fetchListAnalysisStats().catch(() => null);
}

/** 크롤링 회차(수집 기록). 저장된 탐지의 detected_at을 시간 간격으로 묶어 1회 실행으로 본다. */
export type CrawlRun = {
  /** 회차의 마지막 수집 시각 (KST "YYYY-MM-DD HH:mm") */
  finishedAt: string;
  /** 회차의 마지막 수집 시각 (epoch ms) — 다음 자동 실행 추정에 쓴다 */
  finishedAtMs: number;
  /** 이 회차에서 새로 저장된 탐지 수 */
  count: number;
  /** is_drug=true(양성 판정) 건수 */
  positive: number;
  /** is_drug=false(음성 판정) 건수 */
  negative: number;
  /** 매칭 빈도 상위 키워드 (최대 3개) */
  keywords: string[];
  /** 수집된 플랫폼 라벨 */
  platforms: string[];
};

export type CrawlRunsResult =
  | { ok: true; runs: CrawlRun[] }
  | { ok: false; reason: "unauthorized" | "error" };

/**
 * 같은 실행에서 저장된 탐지는 수집 시각이 몰려 있다. 간격이 이 값을 넘으면 다른 회차로 본다.
 * (자동 크롤링 최소 주기 10분, 실행 자체는 수 분 안에 끝나는 전제의 휴리스틱.
 *  백엔드에 실행 이력 API가 생기면 이 집계를 교체한다.)
 */
const RUN_GAP_MS = 5 * 60 * 1000;

/** 탐지 목록을 수집 시각 기준으로 묶어 최근 크롤링 회차 기록을 만든다. */
export async function fetchCrawlRuns(limit = 10): Promise<CrawlRunsResult> {
  try {
    const { status, data } = await request("/detections");
    if (status === 401 || status === 403) return { ok: false, reason: "unauthorized" };
    if (!Array.isArray(data)) return { ok: false, reason: "error" };

    const items = data
      .flatMap((item) => {
        if (typeof item !== "object" || item === null) return [];
        const raw = item as Record<string, unknown>;
        if (typeof raw.detected_at !== "string") return [];
        const at = new Date(raw.detected_at).getTime();
        if (!Number.isFinite(at)) return [];
        return [{
          at,
          iso: raw.detected_at,
          keywords: toStringList(raw.keyword),
          platform: typeof raw.platform === "string" ? raw.platform : "",
          flagged: typeof raw.is_drug === "boolean" ? raw.is_drug : null,
        }];
      })
      .sort((a, b) => b.at - a.at);

    const runs: CrawlRun[] = [];
    let group: typeof items = [];
    const flush = () => {
      if (group.length === 0) return;
      const keywordCounts = new Map<string, number>();
      const platforms = new Set<string>();
      let positive = 0;
      let negative = 0;
      for (const item of group) {
        for (const word of item.keywords) keywordCounts.set(word, (keywordCounts.get(word) ?? 0) + 1);
        if (item.platform) platforms.add(PLATFORM_LABEL[item.platform.toLowerCase()] ?? item.platform);
        if (item.flagged === true) positive += 1;
        if (item.flagged === false) negative += 1;
      }
      runs.push({
        finishedAt: formatDateTime(group[0].iso),
        finishedAtMs: group[0].at,
        count: group.length,
        positive,
        negative,
        keywords: [...keywordCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([word]) => word),
        platforms: [...platforms],
      });
      group = [];
    };

    for (const item of items) {
      if (group.length > 0 && group[group.length - 1].at - item.at > RUN_GAP_MS) {
        flush();
        if (runs.length >= limit) break;
      }
      group.push(item);
    }
    if (runs.length < limit) flush();
    return { ok: true, runs: runs.slice(0, limit) };
  } catch {
    return { ok: false, reason: "error" };
  }
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
        adminId: typeof raw.admin_id === "string" ? raw.admin_id : "",
      },
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}
