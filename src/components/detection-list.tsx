"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, RotateCcw, FileText, Image as ImageIcon, ScanText, Info, X } from "lucide-react";
import { STATUS_FILTERS, STATUS_LABEL, sourceHost, type DetectionRow } from "@/lib/detections";
import { VERDICTS, PERIODS, readFilters, filterDetections, imageVerdict, verdictMatches } from "@/lib/detection-filters";
import styles from "./detections.module.css";

const PER_PAGE = 10;
function VerdictBadge({ value }: { value: boolean | null }) {
  return value === null ? <span className={styles.cellNone} title="판정 미제공">미제공</span>
    : <span className={styles.verdictBadge} data-flagged={value}>{value ? "양성" : "음성"}</span>;
}
export default function DetectionList({ items }: { items: DetectionRow[] }) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filters = readFilters(params);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const filtered = filterDetections(items, filters, today);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const requestedPage = Number(params.get("page"));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const invalidRange = filters.period === "custom" && filters.from && filters.to && filters.from > filters.to;
  const hasText = items.some((item) => item.textFlagged !== null);
  const hasImage = items.some((item) => imageVerdict(item) !== null);
  const typeOptions = [{ key: "text", label: "텍스트 양성", Icon: FileText, available: hasText },
    { key: "image", label: "이미지 양성", Icon: ImageIcon, available: hasImage }];

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    next.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (!value || (["verdict", "status", "period"].includes(key) && value === "all")) next.delete(key);
      else next.set(key, value);
    }
    window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
  }
  function toggleType(type: string) {
    const current = readFilters(new URLSearchParams(window.location.search)).types;
    update({ verdict: "positive", types: (current.includes(type) ? current.filter((v) => v !== type) : [...current, type]).join(",") });
  }
  function reset() { window.history.replaceState(null, "", window.location.pathname); }
  const active = [
    ...(filters.query ? [{ label: `검색: ${filters.query}`, clear: () => update({ q: "" }) }] : []),
    ...(filters.verdict !== "all" ? [{ label: `판정: ${VERDICTS.find((v) => v.key === filters.verdict)?.label}`, clear: () => update({ verdict: "all", types: "" }) }] : []),
    ...(filters.status !== "all" ? [{ label: `검토: ${STATUS_FILTERS.find((v) => v.key === filters.status)?.label}`, clear: () => update({ status: "all" }) }] : []),
    ...filters.types.map((type) => ({ label: type === "text" ? "텍스트 양성" : "이미지 양성", clear: () => update({ types: filters.types.filter((v) => v !== type).join(",") }) })),
    ...(filters.period !== "all" ? [{ label: filters.period === "custom" ? `${filters.from || "시작일"} ~ ${filters.to || "종료일"}` : PERIODS.find((p) => p.key === filters.period)?.label, clear: () => update({ period: "all", from: "", to: "" }) }] : []),
  ];
  const detailQuery = new URLSearchParams(searchParams.toString());
  detailQuery.set("page", String(page));
  return (
    <div className={styles.page}>
      <div className={styles.listIntro}><div><h1>탐지 게시글</h1><p>판정과 검토 상태를 조합해 확인할 게시글을 찾아보세요.</p></div><span>전체 {items.length.toLocaleString()}건</span></div>
      <section className={styles.filterPanel} aria-label="탐지 게시글 필터">
        <div className={styles.filterSearchRow}>
          <div className={styles.search}><Search aria-hidden="true" /><input type="search" value={filters.query} onChange={(e) => update({ q: e.target.value })} placeholder="게시글 내용 · 작성자 · 키워드 검색" aria-label="탐지 게시글 검색" /></div>
          <button className={styles.resetButton} onClick={reset} disabled={!active.length}><RotateCcw size={15} aria-hidden="true" />초기화</button>
        </div>
        <div className={styles.verdictTabs} role="group" aria-label="종합 판정">
          {VERDICTS.map((v) => <button key={v.key} aria-pressed={filters.verdict === v.key} onClick={() => update({ verdict: v.key, types: "" })} data-verdict={v.key}>{v.label}<span>{items.filter((item) => verdictMatches(item, v.key)).length}</span></button>)}
        </div>
        <div className={styles.filterFields}>
          <label>검토 상태<select value={filters.status} onChange={(e) => update({ status: e.target.value })}>{STATUS_FILTERS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</select></label>
          <label>탐지 기간 <small>KST 기준</small><select value={filters.period} onChange={(e) => update({ period: e.target.value, from: "", to: "" })}>{PERIODS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}</select></label>
          {filters.period === "custom" && <div className={styles.dateRange}><label>시작일<input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} /></label><span>–</span><label>종료일<input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} /></label></div>}
        </div>
        {invalidRange && <p className={styles.filterError} role="alert">종료일은 시작일 이후로 선택해 주세요.</p>}
        <div className={styles.positiveTypes}>
          <div className={styles.filterLabel}><SlidersHorizontal size={15} aria-hidden="true" />양성 유형 <small>복수 선택 · 선택한 유형 중 하나 이상</small></div>
          <div className={styles.typeButtons} role="group" aria-label="양성 유형">
            {typeOptions.map(({ key, label, Icon, available }) => <button key={key} disabled={!available && !filters.types.includes(key)} aria-pressed={filters.types.includes(key)} onClick={() => toggleType(key)}><Icon size={16} aria-hidden="true" />{label}{!available && <small>미제공</small>}</button>)}
            <button disabled title="OCR의 개별 판정이 제공되면 사용할 수 있습니다"><ScanText size={16} aria-hidden="true" />OCR 양성<small>연동 대기</small></button>
          </div>
          <p className={styles.filterHint}><Info size={14} aria-hidden="true" />{!hasText || !hasImage ? "목록에 개별 판정이 없는 유형은 필터를 사용할 수 없습니다. " : "유형 필터는 개별 판정이 제공된 게시글만 포함합니다. "}OCR 추출 여부와 OCR 양성 판정은 다릅니다.</p>
        </div>
      </section>
      <div className={styles.resultsHeader}><p role="status">검색 결과 <strong>{filtered.length.toLocaleString()}건</strong><span> / 전체 {items.length.toLocaleString()}건</span></p><small>종합 판정 탭의 건수는 전체 목록 기준</small></div>
      {active.length > 0 && <div className={styles.activeFilters} aria-label="적용된 필터">{active.map((filter, i) => <button key={i} onClick={filter.clear} aria-label={`${filter.label} 필터 해제`}>{filter.label}<X size={13} aria-hidden="true" /></button>)}</div>}
      <p className={styles.scrollHint}>표를 좌우로 움직이면 텍스트·이미지 판정과 검토 상태를 확인할 수 있습니다.</p>
      <div className={styles.card}>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="탐지 결과 표. 좁은 화면에서 좌우로 스크롤할 수 있습니다">
          <table className={`${styles.table} ${styles.filteredTable}`}><thead><tr><th scope="col">게시글</th><th scope="col">종합 판정</th><th scope="col">텍스트</th><th scope="col">이미지</th><th scope="col">탐지 시각</th><th scope="col">검토 상태</th></tr></thead>
            <tbody>{rows.map((item) => <tr className={styles.row} key={item.id}>
              <td className={styles.postCell}><Link href={`/detections/${encodeURIComponent(item.id)}?${detailQuery}`} className={styles.summaryLink} prefetch={false}>{item.summary}</Link><div className={styles.postMeta}><span>{item.nickname}</span><a className={styles.sourceLink} href={item.sourceUrl} target="_blank" rel="noreferrer noopener">{sourceHost(item.sourceUrl) || item.platform}</a></div></td>
              <td><VerdictBadge value={item.isDrug} /></td><td><VerdictBadge value={item.textFlagged} /></td><td><VerdictBadge value={imageVerdict(item)} /></td>
              <td><time className={styles.detectedAt}>{item.detectedAt}</time></td><td><span className={styles.status} data-status={item.status}>{STATUS_LABEL[item.status]}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <div className={styles.filterEmpty} role="status"><Search size={26} aria-hidden="true" /><strong>{items.length ? "조건에 맞는 게시글이 없습니다" : "아직 수집된 게시글이 없습니다"}</strong><p>{items.length ? "선택한 판정이나 기간을 바꿔 다시 확인해 보세요." : "크롤링으로 수집된 게시글이 여기에 표시됩니다."}</p>{active.length > 0 && <button className={styles.resetButton} onClick={reset}>필터 초기화</button>}</div>}
        <p className={styles.resultNote}>종합 판정과 텍스트·이미지 판정은 별도 결과입니다. 미제공은 음성이 아니며, 게시글을 선택하면 상세 분석을 확인할 수 있습니다.</p>
        <nav className={styles.filterPagination} aria-label="페이지 이동"><span>{filtered.length ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)}` : "0"} / {filtered.length}건</span><div><button className={styles.pageButton} disabled={page === 1} onClick={() => update({ page: String(page - 1) })} aria-label="이전 페이지"><ChevronLeft size={16} /></button><span>{page} / {totalPages}</span><button className={styles.pageButton} disabled={page === totalPages} onClick={() => update({ page: String(page + 1) })} aria-label="다음 페이지"><ChevronRight size={16} /></button></div></nav>
      </div>
    </div>
  );
}
