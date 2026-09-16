export async function analyzeText(text: unknown): Promise<{ is_drug: boolean }> {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("분석할 텍스트를 입력해 주세요.");
  }

  const baseUrl = process.env.BACKEND_API_URL || "https://drug-detection-671085027854.asia-northeast3.run.app";
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/public/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw new Error("분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw new Error("분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (response.status === 429) throw new Error("요청이 많습니다. 잠시 후 다시 시도해 주세요.");
  if (response.status === 422) throw new Error("분석할 텍스트를 확인해 주세요.");
  if (!response.ok) throw new Error("분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");

  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== "object" || !("is_drug" in data) || typeof data.is_drug !== "boolean") {
    throw new Error("분석 결과를 확인할 수 없습니다. 다시 시도해 주세요.");
  }
  return { is_drug: data.is_drug };
}
