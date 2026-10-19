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
  | { ok: true; summary: DashboardSummary }
  | { ok: false; reason: "unauthorized" | "error" };

const EMPTY_SUMMARY: DashboardSummary = { total: 0, today: 0, unconfirmed: 0, trend: [] };

function toCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * 응답이 비어 있어도 기본값(0·빈 목록)으로 채워 항상 대시보드를 그린다.
 * 로그인 문제(401/403)일 때만 실패로 처리한다.
 */
export async function fetchDashboard(): Promise<DashboardResult> {
  const fallback = { status: 0, data: null as unknown };
  const summaryRes = await request("/dashboard/summary").catch(() => fallback);
  if (summaryRes.status === 401 || summaryRes.status === 403) {
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
  return { ok: true, summary };
}

/** 대시보드 텍스트·이미지 분석 통계 (실데이터 집계) */
export type AnalysisStats = {
  /** 텍스트 분석이 수행된 게시글 수 */
  analyzedText: number;
  /** 모델 점수(prob_drug)가 있는 건수 */
  textModel: number;
  /** 규칙 매칭만 수행된 건수 */
  textRuleOnly: number;
  /** 단어 사전(용어) 매칭 상위 분포 */
  terms: { name: string; count: number }[];
  /** 동사 사전(의도) 매칭 상위 분포 */
  intents: { name: string; count: number }[];
  imageTotal: number;
  withOcr: number;
  withoutOcr: number;
  /** 검출 객체 클래스 분포 */
  objects: { name: string; count: number }[];
};

function topCounts(map: Map<string, number>, limit = 5) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 이미지 모델이 탐지하는 객체 클래스. 분포에 0건인 클래스도 함께 보여주기 위한 기준 목록 */
const OBJECT_CLASSES = ["Cocaine", "Heroin", "Shrooms", "Marijuana"];

/**
 * 목록의 모든 게시글 상세를 모아 텍스트·이미지 통계를 집계한다.
 * TODO(stats): 게시글이 많아지면 요청이 N+1로 늘어나므로 백엔드 통계 API로 교체한다.
 */
export async function fetchAnalysisStats(): Promise<AnalysisStats | null> {
  try {
    const { status, data } = await request("/detections");
    if (status !== 200 || !Array.isArray(data)) return null;
    const ids = data
      .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>).id : null))
      .filter((id): id is string => typeof id === "string");
    const details = await Promise.all(
      ids.map((id) => request(`/detections/${encodeURIComponent(id)}`).catch(() => ({ status: 0, data: null as unknown }))),
    );

    let analyzedText = 0;
    let textModel = 0;
    let textRuleOnly = 0;
    let imageTotal = 0;
    let withOcr = 0;
    const termCounts = new Map<string, number>();
    const intentCounts = new Map<string, number>();
    // 탐지되지 않은 클래스도 0건으로 분포에 나오도록 기준 클래스를 미리 채워둔다.
    const objectCounts = new Map<string, number>(OBJECT_CLASSES.map((name) => [name, 0]));

    for (const { data: raw } of details) {
      if (typeof raw !== "object" || raw === null) continue;
      const detail = raw as Record<string, unknown>;
      const text = detail.text_ai_result;
      if (typeof text === "object" && text !== null) {
        analyzedText += 1;
        const t = text as Record<string, unknown>;
        if (typeof t.prob_drug === "number") textModel += 1;
        else textRuleOnly += 1;
        for (const word of toStringList(t.matched_terms)) termCounts.set(word, (termCounts.get(word) ?? 0) + 1);
        for (const word of toStringList(t.matched_intents)) intentCounts.set(word, (intentCounts.get(word) ?? 0) + 1);
      }
      if (Array.isArray(detail.image_ai_results)) {
        for (const item of detail.image_ai_results) {
          if (typeof item !== "object" || item === null) continue;
          const image = item as Record<string, unknown>;
          imageTotal += 1;
          if (typeof image.ocr_text === "string" && image.ocr_text.trim()) withOcr += 1;
          if (Array.isArray(image.detected_objects)) {
            for (const objectRaw of image.detected_objects) {
              if (typeof objectRaw !== "object" || objectRaw === null) continue;
              const name = (objectRaw as Record<string, unknown>).class_name;
              if (typeof name === "string" && name) objectCounts.set(name, (objectCounts.get(name) ?? 0) + 1);
            }
          }
        }
      }
    }

    return {
      analyzedText,
      textModel,
      textRuleOnly,
      terms: topCounts(termCounts),
      intents: topCounts(intentCounts),
      imageTotal,
      withOcr,
      withoutOcr: imageTotal - withOcr,
      objects: topCounts(objectCounts, 8),
    };
  } catch {
    return null;
  }
}

/** 크롤링 회차(수집 기록). 저장된 탐지의 detected_at을 시간 간격으로 묶어 1회 실행으로 본다. */
export type CrawlRun = {
  /** 회차의 마지막 수집 시각 (KST "YYYY-MM-DD HH:mm") */
  finishedAt: string;
  /** 회차의 마지막 수집 시각 (epoch ms) — 다음 자동 실행 추정에 쓴다 */
  finishedAtMs: number;
  /** 이 회차에서 새로 저장된 탐지 수 */
  count: number;
  /** 종합 점수 0.5 이상(양성 판정) 건수 */
  positive: number;
  /** 종합 점수 0.5 미만(음성 판정) 건수 */
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
          flagged: typeof raw.score === "number" && raw.score >= 0.5,
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
      for (const item of group) {
        for (const word of item.keywords) keywordCounts.set(word, (keywordCounts.get(word) ?? 0) + 1);
        if (item.platform) platforms.add(PLATFORM_LABEL[item.platform.toLowerCase()] ?? item.platform);
        if (item.flagged) positive += 1;
      }
      runs.push({
        finishedAt: formatDateTime(group[0].iso),
        finishedAtMs: group[0].at,
        count: group.length,
        positive,
        negative: group.length - positive,
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
      },
    };
  } catch {
    return { ok: false, reason: "error" };
  }
}
