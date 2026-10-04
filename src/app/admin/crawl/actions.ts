"use server";

import { cookies } from "next/headers";

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

export interface CrawlResult {
  total: number;
  saved: number;
  skipped: number;
}

/** POST /internal/crawl 수동 실행. X-Internal-Key는 서버 환경 변수(INTERNAL_API_KEY)에서만 읽는다. */
export async function triggerCrawl(maxResults: number): Promise<
  { success: true; result: CrawlResult } | { success: false; message: string }
> {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (!token) return { success: false, message: "로그인이 필요합니다. 다시 로그인해 주세요." };

  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) {
    return { success: false, message: "서버에 INTERNAL_API_KEY 환경 변수가 설정되어 있지 않아 크롤링을 실행할 수 없습니다." };
  }

  const max = Math.min(100, Math.max(10, Math.round(maxResults) || 100));
  const baseUrl = (process.env.BACKEND_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

  try {
    // 크롤링 결과를 귀속시킬 admin_id는 로그인한 관리자 프로필에서 가져온다.
    const profileResponse = await fetch(`${baseUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (profileResponse.status === 401 || profileResponse.status === 403) {
      return { success: false, message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    }
    if (!profileResponse.ok) {
      return { success: false, message: "회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
    const profile = await profileResponse.json();
    if (typeof profile?.id !== "string") {
      return { success: false, message: "회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }

    const response = await fetch(`${baseUrl}/internal/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": apiKey },
      body: JSON.stringify({ admin_id: profile.id, max_results: max }),
      cache: "no-store",
      // 수집·AI 분석까지 돌기 때문에 오래 걸릴 수 있다.
      signal: AbortSignal.timeout(300_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "내부 API 키가 올바르지 않습니다. 서버 설정을 확인해 주세요." };
    }
    if (response.status === 422) {
      return { success: false, message: "요청 값을 확인해 주세요. 수집 건수는 10~100 사이여야 합니다." };
    }
    if (!response.ok) {
      return { success: false, message: "크롤링 실행에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }

    const data = await response.json();
    if (typeof data?.total !== "number" || typeof data?.saved !== "number" || typeof data?.skipped !== "number") {
      return { success: false, message: "서버의 응답을 확인할 수 없습니다. 탐지 게시글 목록에서 결과를 확인해 주세요." };
    }
    return { success: true, result: { total: data.total, saved: data.saved, skipped: data.skipped } };
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      return { success: false, message: "크롤링 응답 대기 시간이 초과되었습니다. 실행은 계속될 수 있으니 잠시 후 탐지 게시글 목록을 확인해 주세요." };
    }
    return { success: false, message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
