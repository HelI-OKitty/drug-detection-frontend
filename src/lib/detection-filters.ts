import type { DetectionRow } from "./detections";

export const VERDICTS = [
  { key: "all", label: "전체" },
  { key: "positive", label: "양성" },
  { key: "negative", label: "음성" },
  { key: "unknown", label: "판정 미제공" },
] as const;
export const PERIODS = [
  { key: "all", label: "전체 기간" }, { key: "today", label: "오늘" },
  { key: "7", label: "최근 7일" }, { key: "30", label: "최근 30일" },
  { key: "custom", label: "직접 지정" },
] as const;
export type DetectionFilters = {
  query: string;
  verdict: string;
  status: string;
  types: string[];
  period: string;
  from: string;
  to: string;
};
export function readFilters(params: URLSearchParams): DetectionFilters {
  const verdict = params.get("verdict") ?? "all";
  const status = params.get("status") ?? "all";
  const period = params.get("period") ?? "all";
  return {
    query: params.get("q") ?? "",
    verdict: VERDICTS.some((v) => v.key === verdict) ? verdict : "all",
    status: ["unreviewed", "reviewing", "confirmed"].includes(status) ? status : "all",
    types: [...new Set((params.get("types") ?? "").split(",").filter((v) => v === "text" || v === "image"))],
    period: PERIODS.some((p) => p.key === period) ? period : "all",
    from: validDate(params.get("from") ?? ""), to: validDate(params.get("to") ?? ""),
  };
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}
export function imageVerdict(item: DetectionRow): boolean | null {
  return item.imageAnalyses.length ? item.imageAnalyses.some((image) => image.flagged === true) : null;
}
export function verdictMatches(item: DetectionRow, verdict: string) {
  return verdict === "all" || (verdict === "positive" ? item.isDrug === true
    : verdict === "negative" ? item.isDrug === false : item.isDrug === null);
}
export function filterDetections(items: DetectionRow[], filters: DetectionFilters, today: string) {
  const query = filters.query.trim().toLowerCase();
  let from = filters.period === "custom" ? filters.from : "";
  const to = filters.period === "custom" ? filters.to : filters.period === "all" ? "" : today;
  if (["today", "7", "30"].includes(filters.period)) {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (filters.period === "today" ? 0 : Number(filters.period) - 1));
    from = date.toISOString().slice(0, 10);
  }
  if (from && to && from > to) return [];
  return items.filter((item) => {
    if (!verdictMatches(item, filters.verdict)) return false;
    if (filters.status !== "all" && filters.status !== item.status) return false;
    // 여러 유형 선택은 OR. 종합 양성 중 실제 개별 판정이 확인된 항목만 포함한다.
    if (filters.types.length && (item.isDrug !== true || !filters.types.some((type) =>
      type === "text" ? item.textFlagged === true : imageVerdict(item) === true))) return false;
    const date = validDate(item.detectedAt.slice(0, 10));
    if ((from || to) && (!date || (from && date < from) || (to && date > to))) return false;
    return !query || [item.summary, item.nickname, ...item.keywords].some((value) => value.toLowerCase().includes(query));
  });
}
