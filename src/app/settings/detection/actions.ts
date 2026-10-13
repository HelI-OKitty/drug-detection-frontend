"use server";

// GET/PATCH /crawl-settings, PATCH /crawl-settings/toggle 연동.
// 탐지 설정 화면(키워드·주기·수집 건수·자동 크롤링 토글)의 값을 백엔드에 저장한다.

import { cookies } from "next/headers";

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

export interface CrawlSettings {
  /** 크롤링 키워드 목록 (최대 13개) */
  keywords: string[];
  /** 1회 최대 수집 건수 (10~100) */
  maxResults: number;
  /** 자동 크롤링 활성화 여부 */
  crawlEnabled: boolean;
  /** 크롤링 주기 (분: 10/60/120/180) */
  scheduleInterval: number;
}

export type CrawlSettingsResult =
  | { success: true; settings: CrawlSettings }
  | { success: false; message: string };

function parseSettings(data: unknown): CrawlSettings | null {
  if (typeof data !== "object" || data === null) return null;
  const raw = data as Record<string, unknown>;
  if (
    !Array.isArray(raw.keywords) ||
    typeof raw.max_results !== "number" ||
    typeof raw.crawl_enabled !== "boolean" ||
    typeof raw.schedule_interval !== "number"
  ) {
    return null;
  }
  return {
    keywords: raw.keywords.filter((word): word is string => typeof word === "string" && word.length > 0),
    maxResults: raw.max_results,
    crawlEnabled: raw.crawl_enabled,
    scheduleInterval: raw.schedule_interval,
  };
}

async function callSettings(path: string, init: RequestInit = {}): Promise<CrawlSettingsResult> {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (!token) return { success: false, message: "로그인이 필요합니다. 다시 로그인해 주세요." };
  const baseUrl = (process.env.BACKEND_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      // 토글은 GCP Scheduler job 생성·삭제까지 수행하므로 여유를 둔다.
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    }
    if (!response.ok) {
      // 백엔드가 내려주는 detail 메시지(예: 환경 변수 설정 오류)를 그대로 보여줘 원인을 파악할 수 있게 한다.
      const body: unknown = await response.json().catch(() => null);
      const detail =
        typeof body === "object" && body !== null && typeof (body as Record<string, unknown>).detail === "string"
          ? ((body as Record<string, unknown>).detail as string)
          : null;
      if (response.status === 422) {
        return {
          success: false,
          message: detail
            ? `설정 값을 확인해 주세요: ${detail}`
            : "설정 값을 확인해 주세요. 키워드는 최대 13개, 수집 건수는 10~100 사이여야 합니다.",
        };
      }
      return {
        success: false,
        message: detail
          ? `서버 오류: ${detail}`
          : "설정을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    const settings = parseSettings(await response.json().catch(() => null));
    if (!settings) return { success: false, message: "서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요." };
    return { success: true, settings };
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      return { success: false, message: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." };
    }
    return { success: false, message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/** 현재 관리자의 크롤링 설정 조회 */
export async function fetchCrawlSettings(): Promise<CrawlSettingsResult> {
  return callSettings("/crawl-settings");
}

/** 키워드·수집 건수·주기 저장 */
export async function updateCrawlSettings(input: {
  keywords: string[];
  maxResults: number;
  scheduleInterval: number;
}): Promise<CrawlSettingsResult> {
  return callSettings("/crawl-settings", {
    method: "PATCH",
    body: JSON.stringify({
      keywords: input.keywords,
      max_results: input.maxResults,
      schedule_interval: input.scheduleInterval,
    }),
  });
}

/** 자동 크롤링 켜기/끄기 (켜면 since_id 리셋 + Scheduler job 생성, 끄면 job 삭제) */
export async function toggleCrawlEnabled(enabled: boolean): Promise<CrawlSettingsResult> {
  return callSettings("/crawl-settings/toggle", {
    method: "PATCH",
    body: JSON.stringify({ crawl_enabled: enabled }),
  });
}
