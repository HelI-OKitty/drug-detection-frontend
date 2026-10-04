"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { confirmDetection, deleteDetection } from "@/app/detections/[id]/actions";
import {
  RISK_LABEL,
  STATUS_LABEL,
  riskBand,
  scoreColors,
  shortUrl,
  type DetectionDetailData,
  type ReviewStatus,
} from "@/lib/detections";
import styles from "./detections.module.css";

const GAUGE_RADIUS = 63;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

/** 본문에서 탐지 키워드에 해당하는 구간을 <mark>로 감싼다. */
function highlightKeywords(content: string, keywords: string[]) {
  const targets = keywords.filter(Boolean);
  if (targets.length === 0) return content;

  const pattern = targets
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts = content.split(new RegExp(`(${pattern})`, "g"));

  return parts.map((part, index) =>
    targets.includes(part)
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`text-${index}`}>{part}</Fragment>,
  );
}

export default function DetectionDetail({ detection }: { detection: DetectionDetailData }) {
  const [status, setStatus] = useState<ReviewStatus>(detection.status);
  const [pending, setPending] = useState<"confirm" | "delete" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  // 이미지 원본 보기는 Esc 키로도 닫는다.
  useEffect(() => {
    if (!viewerUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerUrl]);
  const band = riskBand(detection.score);
  const colors = scoreColors(detection.score);

  async function handleConfirm() {
    if (pending) return;
    setError("");
    setPending("confirm");
    const result = await confirmDetection(detection.id);
    if (result.success) {
      setStatus("confirmed");
      router.refresh();
    } else {
      setError(result.message);
    }
    setPending(null);
  }

  async function handleDelete() {
    if (pending) return;
    setError("");
    setPending("delete");
    const result = await deleteDetection(detection.id);
    if (result.success) {
      router.push("/detections");
      router.refresh();
      return;
    }
    setError(result.message);
    setPending(null);
    setConfirmOpen(false);
  }

  return (
    <div className={styles.page}>
      <Link href="/detections" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" />목록으로
      </Link>

      <div className={styles.detailLayout}>
        <article className={styles.postCard}>
          <header className={styles.postHeader}>
            <div className={styles.postIdentity}>
              <strong>{detection.nickname}</strong>
              <span>{detection.platform} · 게시 {detection.postedAt}</span>
            </div>
            <span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span>
          </header>

          <p className={styles.postContent}>
            {highlightKeywords(detection.content, detection.keywords)}
          </p>

          {detection.images.length > 0 ? (
            <div className={styles.images}>
              {detection.images.map((image, index) => (
                <button
                  type="button"
                  className={styles.imageBox}
                  key={`${image.url}-${index}`}
                  onClick={() => setViewerUrl(image.url)}
                  aria-label={`첨부 이미지 ${index + 1} 원본 크기로 보기`}
                >
                  {/* 외부 플랫폼 이미지라 호스트를 예측할 수 없어 next/image 대신 img를 쓴다. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={`첨부 이미지 ${index + 1}`} loading="lazy" />
                  <span className={styles.flagBadge} data-flagged={image.flagged}>
                    FLAG {image.score.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.noImages}>첨부된 이미지가 없습니다.</p>
          )}
        </article>

        <aside className={styles.aside}>
          <section className={styles.asideCard} aria-labelledby="risk-title">
            <h2 className={styles.asideTitle} id="risk-title">AI 위험 점수</h2>
            <div className={styles.gaugeWrap}>
              <div className={styles.gauge}>
                <svg viewBox="0 0 150 150" aria-hidden="true">
                  <circle className={styles.gaugeTrack} cx="75" cy="75" r={GAUGE_RADIUS} />
                  <circle
                    className={styles.gaugeValue}
                    cx="75"
                    cy="75"
                    r={GAUGE_RADIUS}
                    style={{ stroke: colors.stroke }}
                    strokeDasharray={`${(GAUGE_CIRCUMFERENCE * detection.score).toFixed(2)} ${GAUGE_CIRCUMFERENCE.toFixed(2)}`}
                  />
                </svg>
                <div className={styles.gaugeText}>
                  <strong className={styles.gaugeScore} style={{ color: colors.fg }}>{detection.score.toFixed(2)}</strong>
                  <small className={styles.gaugeBand}>{RISK_LABEL[band]}</small>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.asideCard} aria-labelledby="meta-title">
            <h2 className={styles.asideTitle} id="meta-title">메타데이터</h2>
            <dl className={styles.metaList}>
              <div className={styles.metaRow}><dt>post_id</dt><dd>{detection.id}</dd></div>
              <div className={styles.metaRow}><dt>posted_at</dt><dd>{detection.postedAt.slice(5)}</dd></div>
              <div className={styles.metaRow}><dt>detected_at</dt><dd>{detection.detectedAt.slice(5)}</dd></div>
              <div className={styles.metaRow}>
                <dt>source_url</dt>
                <dd>
                  <a href={detection.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {shortUrl(detection.sourceUrl)}
                  </a>
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>status</dt>
                <dd><span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span></dd>
              </div>
            </dl>
          </section>

          <section className={styles.asideCard} aria-labelledby="keyword-title">
            <h2 className={styles.asideTitle} id="keyword-title">탐지 키워드</h2>
            <div className={styles.keywords}>
              {detection.keywords.map((keyword) => (
                <span className={styles.keyword} key={keyword}>{keyword}</span>
              ))}
            </div>
          </section>

          <section className={styles.asideCard} aria-labelledby="action-title">
            <h2 className={styles.asideTitle} id="action-title">처리</h2>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleConfirm}
                disabled={status === "confirmed" || pending !== null}
              >
                <Check aria-hidden="true" />{pending === "confirm" ? "저장 중…" : "마약 게시글 확정"}
              </button>
              <button
                type="button"
                className={styles.excludeButton}
                onClick={() => setConfirmOpen(true)}
                disabled={pending !== null}
              >
                <X aria-hidden="true" />오탐 · 제외
              </button>
            </div>
            <p className={error ? styles.actionError : styles.actionNote} role="status">
              {error || (status === "confirmed"
                ? "마약 게시글로 확정된 상태입니다."
                : "확정하면 서버에 저장되며, 오탐 · 제외는 게시글을 완전히 삭제합니다.")}
            </p>
          </section>
        </aside>
      </div>

      {viewerUrl && (
        <div
          className={styles.viewerOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="첨부 이미지 원본 보기"
          onClick={() => setViewerUrl(null)}
        >
          <button type="button" className={styles.viewerClose} onClick={() => setViewerUrl(null)} aria-label="닫기">
            <X aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewerUrl} alt="첨부 이미지 원본" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      {confirmOpen && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => pending === null && setConfirmOpen(false)}>
          <div
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-title">오탐 게시글 삭제</h2>
            <p id="delete-desc">
              이 탐지 게시글을 오탐으로 처리하고 완전히 삭제합니다.
              <br />삭제한 데이터는 복구할 수 없습니다. 계속할까요?
            </p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={pending !== null}>취소</button>
              <button type="button" className={styles.modalDelete} onClick={handleDelete} disabled={pending !== null}>
                {pending === "delete" ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
