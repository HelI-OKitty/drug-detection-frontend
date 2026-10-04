import { NextResponse, type NextRequest } from "next/server";

// 액세스 토큰이 만료(임박)하면 리프레시 토큰으로 갱신해 세션을 이어준다.

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";
const ACCESS_COOKIE = "sentinel_access_token";
const REFRESH_COOKIE = "sentinel_refresh_token";

/** JWT exp를 서명 검증 없이 읽어 만료 1분 전인지 확인한다. 해석 불가 토큰은 갱신 대상으로 본다. */
function expiresSoon(token: string) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)));
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh || (access && !expiresSoon(access))) return NextResponse.next();

  const baseUrl = (process.env.BACKEND_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  let tokens: Record<string, unknown> | null = null;
  let rejected = false;
  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) tokens = await response.json();
    else if ([401, 403, 422].includes(response.status)) rejected = true;
  } catch {
    // 네트워크 문제면 이번 요청은 기존 토큰으로 그대로 진행한다.
  }

  if (tokens && typeof tokens.access_token === "string" && typeof tokens.refresh_token === "string") {
    // 이번 요청의 서버 컴포넌트·액션도 새 토큰을 보도록 요청 쿠키 헤더를 재작성한다.
    const cookiePairs = new Map(request.cookies.getAll().map((cookie) => [cookie.name, cookie.value]));
    cookiePairs.set(ACCESS_COOKIE, tokens.access_token);
    cookiePairs.set(REFRESH_COOKIE, tokens.refresh_token);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("cookie", [...cookiePairs].map(([name, value]) => `${name}=${value}`).join("; "));

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookies.set(ACCESS_COOKIE, tokens.access_token, options);
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, options);
    return response;
  }

  if (rejected) {
    // 리프레시 토큰까지 만료 → 쿠키를 지워 로그인 화면으로 유도한다.
    const response = NextResponse.next();
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  // 정적 리소스를 제외한 모든 경로에서 토큰 상태를 점검한다.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
