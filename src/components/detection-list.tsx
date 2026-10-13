"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  STATUS_FILTERS,
  STATUS_LABEL,
  scoreColors,
  sourceHost,
  toPercent,
  type DetectionRow,
  type StatusFilter,
} from "@/lib/detections";
import styles from "./detections.module.css";

const PER_PAGE = 10;

/** 퍼센트 배지. 값이 없으면 회색 대시 */
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className={styles.cellNone}>–</span>;
  return (
    <span
      className={styles.score}
      style={{
        background: scoreColors(score).bg,
        color: scoreColors(score).fg,
        borderColor: scoreColors(score).border,
      }}
    >
      {toPercent(score)}
    </span>
  );
}

export default function DetectionList({ items }: { items: DetectionRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  // 이미지별 분석 요약 팝오버: 열려 있는 행 id와 화면 좌표
  const [popover, setPopover] = useState<{ id: string; x: number; y: number } | null>(null);
  const selected = popover !== null ? items.find((item) => item.id === popover.id) ?? null : null;

  // 팝오버는 Esc 키로도 닫는다.
  useEffect(() => {
    if (!popover) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popover]);

  /** N장 버튼 위치 기준으로 팝오버를 띄운다. 화면 밖으로 나가면 위/왼쪽으로 뒤집는다. */
  function openPopover(event: MouseEvent<HTMLButtonElement>, item: DetectionRow) {
    if (popover?.id === item.id) {
      setPopover(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 440;
    const height = 76 + item.imageAnalyses.length * 40;
    const x = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const y = rect.bottom + 8 + height > window.innerHeight
      ? Math.max(12, rect.top - height - 8)
      : rect.bottom + 8;
    setPopover({ id: item.id, x, y });
  }

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!keyword) return true;
      return (
        item.summary.toLowerCase().includes(keyword) ||
        item.nickname.toLowerCase().includes(keyword) ||
        item.keywords.some((word) => word.toLowerCase().includes(keyword))
      );
    });
  }, [items, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // 필터가 바뀌어 페이지 수가 줄면 마지막 페이지로 당겨서 빈 화면을 막는다.
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  function changeFilter(next: StatusFilter) {
    setStatus(next);
    setPage(1);
  }

  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder="게시글 내용 · 닉네임 · 키워드 검색…"
            aria-label="탐지 게시글 검색"
          />
        </div>
        <div className={styles.chips} role="group" aria-label="상태 필터">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={styles.chip}
              aria-pressed={status === filter.key}
              onClick={() => changeFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">텍스트</th>
                <th scope="col">검출 객체</th>
                <th scope="col">OCR(최대)</th>
                <th scope="col">이미지</th>
                <th scope="col">게시글</th>
                <th scope="col">닉네임</th>
                <th scope="col">출처</th>
                <th scope="col">탐지 시각</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const objectNames = [...new Set(item.imageAnalyses.flatMap((image) => image.objects.map((object) => object.name)))];
                const ocrScores = item.imageAnalyses
                  .map((image) => image.ocrScore)
                  .filter((score): score is number => score !== null);
                const open = popover?.id === item.id;
                return (
                  <tr className={styles.row} key={item.id}>
                    <td><ScoreBadge score={item.textScore} /></td>
                    <td>
                      {objectNames.length > 0 ? (
                        <span className={styles.objectText}>
                          {objectNames[0]}
                          {objectNames.length > 1 && <small>+{objectNames.length - 1}종</small>}
                        </span>
                      ) : (
                        <span className={styles.cellNone}>–</span>
                      )}
                    </td>
                    <td><ScoreBadge score={ocrScores.length > 0 ? Math.max(...ocrScores) : null} /></td>
                    <td>
                      {item.imageAnalyses.length > 0 ? (
                        <button
                          type="button"
                          className={styles.imageToggle}
                          aria-expanded={open}
                          onClick={(event) => openPopover(event, item)}
                        >
                          {item.imageAnalyses.length}장
                          <ChevronDown aria-hidden="true" />
                        </button>
                      ) : (
                        <span className={styles.cellNone}>–</span>
                      )}
                    </td>
                    <td className={styles.summaryCell}>
                      <Link href={`/detections/${item.id}`} className={styles.summaryLink}>
                        {item.summary}
                      </Link>
                    </td>
                    <td><span className={styles.nickname}>{item.nickname}</span></td>
                    <td>
                      <a
                        className={styles.sourceLink}
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {sourceHost(item.sourceUrl)}
                      </a>
                    </td>
                    <td><span className={styles.detectedAt}>{item.detectedAt.slice(5)}</span></td>
                    <td>
                      <span className={styles.status} data-status={item.status}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <p className={styles.empty} role="status">조건에 맞는 탐지 게시글이 없습니다.</p>
        )}

        {totalPages > 1 && (
          <nav className={styles.pagination} aria-label="페이지 이동">
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="이전 페이지"
            >
              <ChevronLeft aria-hidden="true" size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                className={styles.pageButton}
                aria-current={number === currentPage ? "page" : undefined}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="다음 페이지"
            >
              <ChevronRight aria-hidden="true" size={15} />
            </button>
          </nav>
        )}
      </div>

      {popover && selected && (
        <>
          <div className={styles.popoverBackdrop} onClick={() => setPopover(null)} aria-hidden="true" />
          <div
            className={styles.popover}
            style={{ left: popover.x, top: popover.y }}
            role="dialog"
            aria-label="이미지별 분석 요약"
          >
            <header className={styles.popoverHeader}>
              <h2 className={styles.popoverTitle}>이미지별 분석 요약</h2>
              <button type="button" className={styles.popoverClose} onClick={() => setPopover(null)} aria-label="닫기">
                <X aria-hidden="true" />
              </button>
            </header>
            <ul className={styles.popoverList}>
              {selected.imageAnalyses.map((image, index) => (
                <li className={styles.popoverRow} key={index}>
                  <em>이미지 {index + 1}</em>
                  <span className={styles.popoverObjects}>
                    {image.objects.length > 0
                      ? image.objects.map((object) => object.name).join(" · ")
                      : "미검출"}
                  </span>
                  {image.ocrScore !== null ? (
                    <span
                      className={styles.ocrBadge}
                      style={{
                        background: scoreColors(image.ocrScore).bg,
                        color: scoreColors(image.ocrScore).fg,
                      }}
                    >
                      OCR {toPercent(image.ocrScore)}
                    </span>
                  ) : (
                    <span className={styles.ocrBadge}>OCR –</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
