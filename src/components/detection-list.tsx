"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Search, SlidersHorizontal, RotateCcw, FileText, Image as ImageIcon, ScanText, Info, X } from "lucide-react";
import { STATUS_FILTERS, STATUS_LABEL, sourceHost, missingVerdictReason, type DetectionRow } from "@/lib/detections";
import { VERDICTS, PERIODS, OCR_PRESENCE, readFilters, filterDetections, imageVerdict, verdictMatches } from "@/lib/detection-filters";
import styles from "./detections.module.css";
import FilterSelect from "./filter-select";

const PER_PAGE = 10;
const LIST_POSITION_KEY = "sentinel:detection-list-position";
function VerdictBadge({ value, source }: { value: boolean | null; source?: string | null }) {
  return value === null ? <span className={styles.cellNone} title={missingVerdictReason(source)}>미제공</span>
    : <span className={styles.verdictBadge} data-flagged={value}>{value ? "양성" : "음성"}</span>;
}
export default function DetectionList({ items }: { items: DetectionRow[] }) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const filters = readFilters(params);
  const [searchText, setSearchText] = useState(filters.query);
  const composing = useRef(false);
  useEffect(() => {
    if (!composing.current) setSearchText(filters.query);
  }, [filters.query]);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const filtered = filterDetections(items, filters, today);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const requestedPage = Number(params.get("page"));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
  const firstVisiblePage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstVisiblePage + index);
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const advancedCount = Number(filters.status !== "all") + Number(filters.period !== "all") + Number(filters.hasOcrText !== "all") + filters.types.length;
  const expanded = params.get("filters") === "open" || (params.get("filters") !== "closed" && advancedCount > 0);
  const detailQuery = new URLSearchParams(searchParams.toString());
  detailQuery.set("page", String(page));
  detailQuery.sort();
  const listQuery = detailQuery.toString();

  useEffect(() => {
    let frame = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(LIST_POSITION_KEY) || "null");
      if (saved?.query === listQuery && Number.isFinite(saved.scrollY)) {
        sessionStorage.removeItem(LIST_POSITION_KEY);
        frame = requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
      }
    } catch { /* URL에 저장한 필터와 페이지는 저장소 사용 여부와 무관하게 유지한다. */ }
    return () => cancelAnimationFrame(frame);
  }, [listQuery]);

  function rememberPosition() {
    try {
      sessionStorage.setItem(LIST_POSITION_KEY, JSON.stringify({ query: listQuery, scrollY: window.scrollY }));
    } catch { /* 저장소가 차단된 환경에서는 브라우저의 기본 스크롤 복원을 사용한다. */ }
  }

  function toggleFilters(open: boolean) {
    if (open === expanded) return;
    const next = new URLSearchParams(window.location.search);
    next.set("filters", open ? "open" : "closed");
    window.history.replaceState(null, "", `${window.location.pathname}?${next}`);
  }
  const invalidRange = filters.period === "custom" && filters.from && filters.to && filters.from > filters.to;
  const hasText = items.some((item) => item.textFlagged !== null);
  const hasImage = items.some((item) => imageVerdict(item) !== null);
  const typeOptions = [{ key: "text", label: "텍스트 양성", Icon: FileText, available: hasText },
    { key: "image", label: "이미지 양성", Icon: ImageIcon, available: hasImage },
    { key: "ocr", label: "OCR 양성", Icon: ScanText, available: true }];

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    next.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (!value || (["verdict", "status", "period", "has_ocr_text"].includes(key) && value === "all")) next.delete(key);
      else next.set(key, value);
    }
    window.history.replaceState(null, "", `${window.location.pathname}${next.size ? `?${next}` : ""}`);
  }
  function toggleType(type: string) {
    const current = readFilters(new URLSearchParams(window.location.search)).types;
    update({ verdict: "positive", types: (current.includes(type) ? current.filter((v) => v !== type) : [...current, type]).join(",") });
  }
  function reset() {
    composing.current = false;
    setSearchText("");
    const next = new URLSearchParams();
    next.set("filters", expanded ? "open" : "closed");
    window.history.replaceState(null, "", `${window.location.pathname}?${next}`);
  }
  const active = [
    ...(filters.hasOcrText !== "all" ? [{ label: `OCR 텍스트: ${filters.hasOcrText === "true" ? "있음" : "없음"}`, clear: () => update({ has_ocr_text: "all" }) }] : []),
    ...(filters.query ? [{ label: `검색: ${filters.query}`, clear: () => update({ q: "" }) }] : []),
    ...(filters.verdict !== "all" ? [{ label: `판정: ${VERDICTS.find((v) => v.key === filters.verdict)?.label}`, clear: () => update({ verdict: "all", types: "" }) }] : []),
    ...(filters.status !== "all" ? [{ label: `검토: ${STATUS_FILTERS.find((v) => v.key === filters.status)?.label}`, clear: () => update({ status: "all" }) }] : []),
    ...filters.types.map((type) => ({ label: type === "text" ? "텍스트 양성" : type === "image" ? "이미지 양성" : "OCR 양성", clear: () => update({ types: filters.types.filter((v) => v !== type).join(",") }) })),
    ...(filters.period !== "all" ? [{ label: filters.period === "custom" ? `${filters.from || "시작일"} ~ ${filters.to || "종료일"}` : PERIODS.find((p) => p.key === filters.period)?.label, clear: () => update({ period: "all", from: "", to: "" }) }] : []),
  ];
  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>탐지 게시글</h1>
      <section className={styles.filterPanel} aria-label="탐지 게시글 필터">
        <div className={styles.filterSearchRow}>
          <div className={styles.search}><Search aria-hidden="true" /><input type="search" value={searchText}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setSearchText(event.currentTarget.value);
              update({ q: event.currentTarget.value });
            }}
            onChange={(event) => {
              setSearchText(event.target.value);
              if (!composing.current) update({ q: event.target.value });
            }} placeholder="게시글 내용 · 작성자 · 키워드 검색" aria-label="탐지 게시글 검색" /></div>
          <button className={styles.resetButton} onClick={reset} disabled={!active.length}><RotateCcw size={15} aria-hidden="true" />초기화</button>
        </div>
        <div className={styles.verdictTabs} role="group" aria-label="종합 판정">
          {VERDICTS.map((v) => <button key={v.key} aria-pressed={filters.verdict === v.key} onClick={() => update({ verdict: v.key, types: "" })} data-verdict={v.key}>{v.label}<span>{items.filter((item) => verdictMatches(item, v.key)).length}</span></button>)}
        </div>
        <details className={styles.advancedFilters} open={expanded} onToggle={(event) => toggleFilters(event.currentTarget.open)}>
        <summary><SlidersHorizontal size={16} aria-hidden="true" />상세 필터{advancedCount > 0 && <span>{advancedCount}개 적용</span>}<ChevronDown size={16} className={styles.filterChevron} aria-hidden="true" /></summary>
        <div className={styles.filterFields}>
          <FilterSelect label="검토 상태" value={filters.status} options={STATUS_FILTERS} onChange={(status) => update({ status })} />
          <FilterSelect label="탐지 기간" hint="KST 기준" value={filters.period} options={PERIODS} onChange={(period) => update({ period, from: "", to: "" })} />
          <FilterSelect label="OCR 텍스트" value={filters.hasOcrText} options={OCR_PRESENCE} onChange={(has_ocr_text) => update({ has_ocr_text })} />
          {filters.period === "custom" && <div className={styles.dateRange}><label>시작일<input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} /></label><span>–</span><label>종료일<input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} /></label></div>}
        </div>
        {invalidRange && <p className={styles.filterError} role="alert">종료일은 시작일 이후로 선택해 주세요.</p>}
        <div className={styles.positiveTypes}>
          <div className={styles.filterLabel}><SlidersHorizontal size={15} aria-hidden="true" />양성 유형 <small>복수 선택 · 선택한 유형 중 하나 이상</small></div>
          <div className={styles.typeButtons} role="group" aria-label="양성 유형">
            {typeOptions.map(({ key, label, Icon, available }) => <button key={key} disabled={!available && !filters.types.includes(key)} aria-pressed={filters.types.includes(key)} onClick={() => toggleType(key)}><Icon size={16} aria-hidden="true" />{label}{!available && <small>미제공</small>}</button>)}
          </div>
          <p className={styles.filterHint}><Info size={14} aria-hidden="true" />{!hasText || !hasImage ? "목록에 개별 판정이 없는 유형은 필터를 사용할 수 없습니다. " : "유형 필터는 개별 판정이 제공된 게시글만 포함합니다. "}OCR 추출 여부와 OCR 양성 판정은 다릅니다.</p>
        </div>
        </details>
      </section>
      <div className={styles.resultsHeader}><p role="status">검색 결과 <strong>{filtered.length.toLocaleString()}건</strong><span> / 전체 {items.length.toLocaleString()}건</span></p><small>종합 판정 탭의 건수는 전체 목록 기준</small></div>
      {active.length > 0 && <div className={styles.activeFilters} aria-label="적용된 필터">{active.map((filter, i) => <button key={i} onClick={filter.clear} aria-label={`${filter.label} 필터 해제`}>{filter.label}<X size={13} aria-hidden="true" /></button>)}</div>}
      <p className={styles.scrollHint}>표를 좌우로 움직이면 텍스트·이미지·OCR 판정과 검토 상태를 확인할 수 있습니다.</p>
      <div className={styles.card}>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="탐지 결과 표. 좁은 화면에서 좌우로 스크롤할 수 있습니다">
          <table className={`${styles.table} ${styles.filteredTable}`}><thead><tr><th scope="col">게시글</th><th scope="col">종합 판정</th><th scope="col">텍스트</th><th scope="col">이미지</th><th scope="col">OCR</th><th scope="col">탐지 시각</th><th scope="col">검토 상태</th></tr></thead>
            <tbody>{rows.map((item) => <tr className={styles.row} key={item.id}>
              <td className={styles.postCell}><Link href={`/detections/${encodeURIComponent(item.id)}?${detailQuery}`} className={styles.summaryLink} prefetch={false} onClick={(event) => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0) rememberPosition(); }}>{item.summary}</Link><div className={styles.postMeta}><span>{item.nickname}</span><a className={styles.sourceLink} href={item.sourceUrl} target="_blank" rel="noreferrer noopener">{sourceHost(item.sourceUrl) || item.platform}</a></div></td>
              <td><VerdictBadge value={item.isDrug} /></td><td><VerdictBadge value={item.textFlagged} source={item.textSource} /></td><td><VerdictBadge value={imageVerdict(item)} /></td><td>{item.imageAnalyses.some((image) => image.hasOcrText) ? <VerdictBadge value={item.ocrFlagged ?? null} /> : <span className={styles.cellNone}>OCR 없음</span>}</td>
              <td><time className={styles.detectedAt}>{item.detectedAt}</time></td><td><span className={styles.status} data-status={item.status}>{STATUS_LABEL[item.status]}</span></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!rows.length && <div className={styles.filterEmpty} role="status"><Search size={26} aria-hidden="true" /><strong>{items.length ? "조건에 맞는 게시글이 없습니다" : "아직 수집된 게시글이 없습니다"}</strong><p>{items.length ? "선택한 판정이나 기간을 바꿔 다시 확인해 보세요." : "크롤링으로 수집된 게시글이 여기에 표시됩니다."}</p>{active.length > 0 && <button className={styles.resetButton} onClick={reset}>필터 초기화</button>}</div>}
        <nav className={styles.filterPagination} aria-label="페이지 이동">
          <div className={styles.pageSteps}>
            {[10, 5].map((step) => <button key={step} type="button" className={styles.pageButton} disabled={page === 1} aria-label={`${step}페이지 이전`} title={`${step}페이지 이전`} onClick={() => update({ page: String(Math.max(1, page - step)) })}>{step === 10 ? <ChevronsLeft size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}</button>)}
          </div>
          <div className={styles.pageNumbers}>
            {pageNumbers.map((number) => <button key={number} type="button" className={styles.pageButton} aria-label={`${number}페이지`} aria-current={page === number ? "page" : undefined} onClick={() => update({ page: String(number) })}>{number}</button>)}
          </div>
          <div className={styles.pageSteps}>
            {[5, 10].map((step) => <button key={step} type="button" className={styles.pageButton} disabled={page === totalPages} aria-label={`${step}페이지 다음`} title={`${step}페이지 다음`} onClick={() => update({ page: String(Math.min(totalPages, page + step)) })}>{step === 10 ? <ChevronsRight size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}</button>)}
          </div>
        </nav>
      </div>
    </div>
  );
}
