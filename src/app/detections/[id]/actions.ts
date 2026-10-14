"use server";

import { cookies } from "next/headers";

const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

type ActionResult = { success: true } | { success: false; message: string };

async function detectionRequest(id: string, path: string, init: RequestInit): Promise<ActionResult> {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (!token) return { success: false, message: "로그인이 필요합니다. 다시 로그인해 주세요." };

  try {
    const baseUrl = (process.env.BACKEND_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/detections/${encodeURIComponent(id)}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    }
    if (response.status === 404 || response.status === 422) {
      return { success: false, message: "탐지 게시글을 찾을 수 없습니다. 목록을 새로고침해 주세요." };
    }
    if (!response.ok) {
      return { success: false, message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    }
    return { success: true };
  } catch {
    return { success: false, message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/** 검토 상태를 '확정'으로 저장한다. (PATCH /detections/{id}/status) */
export async function confirmDetection(id: string): Promise<ActionResult> {
  return detectionRequest(id, "/status", {
    method: "PATCH",
    body: JSON.stringify({ review_status: "confirmed" }),
  });
}

/** 오탐 게시글을 완전히 삭제한다. (DELETE /detections/{id}) */
export async function deleteDetection(id: string): Promise<ActionResult> {
  return detectionRequest(id, "", { method: "DELETE" });
}
