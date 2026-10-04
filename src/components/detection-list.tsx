"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  STATUS_FILTERS,
  STATUS_LABEL,
  detections,
  riskBand,
  sourceHost,
  type StatusFilter,
} from "@/lib/detections-sample";
import styles from "./detections.module.css";

const PER_PAGE = 6;

export default function DetectionList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return detections.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!keyword) return true;
      return (
        item.summary.toLowerCase().includes(keyword) ||
        item.nickname.toLowerCase().includes(keyword) ||
        item.keywords.some((word) => word.toLowerCase().includes(keyword))
      );
    });
  }, [query, status]);

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
      <p className={styles.demoLabel}><i />화면 예시 · 실제 운영 데이터가 아닙니다</p>

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
                <th scope="col">SCORE</th>
                <th scope="col">게시글</th>
                <th scope="col">닉네임</th>
                <th scope="col">출처</th>
                <th scope="col">탐지 시각</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className={styles.row}>
                  <td>
                    <span className={styles.score} data-band={riskBand(item.score)}>
                      {item.score.toFixed(2)}
                    </span>
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
              ))}
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
    </div>
  );
}
