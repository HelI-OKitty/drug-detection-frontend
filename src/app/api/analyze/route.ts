// POST /api/analyze — 브라우저의 단순 분석 요청을 백엔드 /public/analyze로 중계하는 same-origin 프록시.
// 브라우저가 백엔드를 직접 호출하면 CORS allowlist에 프론트 도메인을 계속 등록해야 해서,
// 다른 화면(detections-api.ts)처럼 서버를 거치도록 통일한다.

import { NextResponse } from "next/server";

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ detail: "invalid json" }, { status: 400 });
  }

  // 백엔드가 받는 필드만 추려서 전달한다(임의 페이로드 중계 방지).
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const body: Record<string, string> = {};
  if (typeof input.text === "string" && input.text.trim()) body.text = input.text;
  if (typeof input.image === "string" && input.image) body.image = input.image;
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ detail: "text or image required" }, { status: 422 });
  }

  const baseUrl = (process.env.BACKEND_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}/public/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      // AI 분석(OCR·객체 탐지)이 오래 걸릴 수 있다. 클라이언트 타임아웃(120초)보다 짧게 둔다.
      signal: AbortSignal.timeout(115_000),
    });
    // 상태 코드를 그대로 돌려줘서 클라이언트(text-detector.ts)의 429/413/422 분기가 동작하게 한다.
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      return NextResponse.json({ detail: "upstream timeout" }, { status: 504 });
    }
    return NextResponse.json({ detail: "upstream unreachable" }, { status: 502 });
  }
}
