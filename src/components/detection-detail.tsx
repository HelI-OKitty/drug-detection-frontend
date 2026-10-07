"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { confirmDetection, deleteDetection } from "@/app/detections/[id]/actions";
import {
  STATUS_LABEL,
  scoreColors,
  shortUrl,
  toPercent,
  type DetectionDetailData,
  type ReviewStatus,
} from "@/lib/detections";
import styles from "./detections.module.css";

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
  const textAnalysis = detection.textAnalysis;
  const textScore = textAnalysis ? textAnalysis.probDrug : null;
  const imageScore = detection.images.length > 0
    ? Math.max(...detection.images.map((image) => image.score))
    : null;

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
        <div className={styles.mainColumn}>
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
          </article>

          <section className={styles.analysisCard} aria-labelledby="text-analysis-title">
            <header className={styles.analysisHeader}>
              <h2 className={styles.asideTitle} id="text-analysis-title">텍스트 분석 결과</h2>
              {textAnalysis && (
                <span className={styles.analysisBadge} data-flagged={textAnalysis.flagged}>
                  {textAnalysis.flagged ? "마약 의심" : "정상"}
                </span>
              )}
            </header>
            {textAnalysis ? (
              <>
                <div className={styles.probRow}>
                  <span className={styles.probLabel}>마약 의심 비율</span>
                  <div className={styles.probTrack} aria-hidden="true">
                    <i
                      className={styles.probFill}
                      style={{
                        width: toPercent(textAnalysis.probDrug),
                        background: scoreColors(textAnalysis.probDrug).stroke,
                      }}
                    />
                  </div>
                  <strong className={styles.probValue} style={{ color: scoreColors(textAnalysis.probDrug).fg }}>
                    {toPercent(textAnalysis.probDrug)}
                  </strong>
                </div>
                {textAnalysis.matchedTerms.length > 0 && (
                  <div className={styles.matchGroup}>
                    <h3 className={styles.matchTitle}>매칭된 용어</h3>
                    <div className={styles.matchChips}>
                      {textAnalysis.matchedTerms.map((term) => (
                        <span className={styles.termChip} key={term}>{term}</span>
                      ))}
                    </div>
                  </div>
                )}
                {textAnalysis.matchedIntents.length > 0 && (
                  <div className={styles.matchGroup}>
                    <h3 className={styles.matchTitle}>매칭된 의도</h3>
                    <div className={styles.matchChips}>
                      {textAnalysis.matchedIntents.map((intent) => (
                        <span className={styles.intentChip} key={intent}>{intent}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.noAnalysis}>텍스트 분석 결과가 없습니다.</p>
            )}
          </section>

          <section className={styles.analysisCard} aria-labelledby="image-analysis-title">
            <header className={styles.analysisHeader}>
              <h2 className={styles.asideTitle} id="image-analysis-title">이미지 분석 결과</h2>
              {detection.images.length > 0 && (
                <span className={styles.analysisBadge} data-flagged={detection.images.some((image) => image.flagged)}>
                  {detection.images.some((image) => image.flagged) ? "마약 의심" : "정상"}
                </span>
              )}
            </header>
            {detection.images.length > 0 ? (
              <div className={styles.images}>
                {detection.images.map((image, index) => (
                  <figure className={styles.imageItem} key={`${image.url}-${index}`}>
                    <button
                      type="button"
                      className={styles.imageBox}
                      onClick={() => setViewerUrl(image.url)}
                      aria-label={`첨부 이미지 ${index + 1} 원본 크기로 보기`}
                    >
                      {/* 외부 플랫폼 이미지라 호스트를 예측할 수 없어 next/image 대신 img를 쓴다. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={`첨부 이미지 ${index + 1}`} loading="lazy" />
                      <span className={styles.flagBadge} data-flagged={image.flagged}>
                        의심 {toPercent(image.score)}
                      </span>
                    </button>
                    {(image.detectedObjects.length > 0 || image.ocrText) && (
                      <figcaption className={styles.imageMeta}>
                        {image.detectedObjects.length > 0 && (
                          <ul className={styles.objectList}>
                            {image.detectedObjects.map((object, objectIndex) => (
                              <li className={styles.objectRow} key={`${object.name}-${objectIndex}`}>
                                <span className={styles.objectName} title={object.name}>{object.name}</span>
                                <i className={styles.objectTrack} aria-hidden="true">
                                  <b style={{ width: toPercent(object.confidence), background: scoreColors(object.confidence).stroke }} />
                                </i>
                                <span className={styles.objectValue} style={{ color: scoreColors(object.confidence).fg }}>
                                  {toPercent(object.confidence)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {image.ocrText && <p className={styles.ocrText}>OCR · {image.ocrText}</p>}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            ) : (
              <p className={styles.noAnalysis}>첨부된 이미지가 없어 이미지 분석을 수행하지 않았습니다.</p>
            )}
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={styles.asideCard} aria-labelledby="risk-title">
            <h2 className={styles.asideTitle} id="risk-title">마약 의심 비율</h2>
            <dl className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <dt>텍스트</dt>
                <dd>
                  {textScore !== null ? (
                    <>
                      <i className={styles.breakdownTrack} aria-hidden="true">
                        <b style={{ width: toPercent(textScore), background: scoreColors(textScore).stroke }} />
                      </i>
                      <span className={styles.breakdownValue} style={{ color: scoreColors(textScore).fg }}>{toPercent(textScore)}</span>
                    </>
                  ) : (
                    <span className={styles.breakdownEmpty}>분석 없음</span>
                  )}
                </dd>
              </div>
              <div className={styles.breakdownRow}>
                <dt>이미지</dt>
                <dd>
                  {imageScore !== null ? (
                    <>
                      <i className={styles.breakdownTrack} aria-hidden="true">
                        <b style={{ width: toPercent(imageScore), background: scoreColors(imageScore).stroke }} />
                      </i>
                      <span className={styles.breakdownValue} style={{ color: scoreColors(imageScore).fg }}>{toPercent(imageScore)}</span>
                    </>
                  ) : (
                    <span className={styles.breakdownEmpty}>분석 없음</span>
                  )}
                </dd>
              </div>
            </dl>
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
