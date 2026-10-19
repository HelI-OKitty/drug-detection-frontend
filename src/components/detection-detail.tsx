"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ImageOff, X } from "lucide-react";
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
  // 로드에 실패한 이미지 URL 목록. 삭제 여부는 알 수 없으므로 "원본을 불러오지 못함"으로만 표시한다.
  const [brokenUrls, setBrokenUrls] = useState<string[]>([]);
  const router = useRouter();

  function markBroken(url: string) {
    setBrokenUrls((current) => (current.includes(url) ? current : [...current, url]));
  }

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
  // 이미지별 OCR 분석 점수는 toRow의 imageAnalyses에서 가져온다.
  // 실제 이미지가 있을 때만 인덱스가 1:1로 대응하므로 길이가 맞을 때만 사용한다.
  const analyses =
    detection.images.length > 0 && detection.images.length === detection.imageAnalyses.length
      ? detection.imageAnalyses
      : null;
  const detectedNames = [
    ...new Set(detection.images.flatMap((image) => image.detectedObjects.map((object) => object.name))),
  ];
  const ocrScores = (analyses ?? [])
    .map((analysis) => analysis.ocrScore)
    .filter((score): score is number => score !== null);
  const ocrMax = ocrScores.length > 0 ? Math.max(...ocrScores) : null;

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

            {detection.keywords.length > 0 && (
              <div className={styles.postKeywords} aria-label="탐지 키워드">
                <span className={styles.postKeywordsLabel}>탐지 키워드</span>
                <span className={styles.postKeywordList}>{detection.keywords.join(" · ")}</span>
              </div>
            )}
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
                {/* prob_drug는 ML 모델 점수, matched_*는 사전 기반 규칙 결과로 서로 다른 분석이다. */}
                {textAnalysis.probDrug !== null ? (
                  <div className={styles.probRow}>
                    <span className={styles.probLabel}>모델 마약 의심 비율</span>
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
                ) : (
                  <p className={styles.ruleNote}>
                    모델 확률 점수가 제공되지 않은 게시글입니다. 아래 사전(용어·의도) 규칙 매칭 결과로 판정되었습니다.
                  </p>
                )}
                {textAnalysis.matchedTerms.length > 0 && (
                  <div className={styles.matchGroup}>
                    <h3 className={styles.matchTitle}>매칭된 용어 (단어 사전)</h3>
                    <div className={styles.matchChips}>
                      {textAnalysis.matchedTerms.map((term) => (
                        <span className={styles.termChip} key={term}>{term}</span>
                      ))}
                    </div>
                  </div>
                )}
                {textAnalysis.matchedIntents.length > 0 && (
                  <div className={styles.matchGroup}>
                    <h3 className={styles.matchTitle}>매칭된 의도 (동사 사전)</h3>
                    <div className={styles.matchChips}>
                      {textAnalysis.matchedIntents.map((intent) => (
                        <span className={styles.intentChip} key={intent}>{intent}</span>
                      ))}
                    </div>
                  </div>
                )}
                {textAnalysis.matchedTerms.length === 0 && textAnalysis.matchedIntents.length === 0 && (
                  <div className={styles.matchGroup}>
                    <h3 className={styles.matchTitle}>규칙 매칭</h3>
                    <p className={styles.noMatch}>사전과 매칭된 용어·의도가 없습니다.</p>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.noAnalysis}>텍스트 분석 결과가 없습니다.</p>
            )}
          </section>

          <section className={styles.analysisCard} aria-labelledby="image-analysis-title">
            <header className={styles.analysisHeader}>
              {/* 카드 레벨 종합 배지는 결합 정책(객체·OCR 합산 규칙) 확정 전까지 두지 않는다.
                  판정은 이미지별 객체 탐지/OCR 블록 배지로만 표시한다. */}
              <h2 className={styles.asideTitle} id="image-analysis-title">이미지 분석 결과</h2>
            </header>
            {detection.images.length > 0 ? (
              <ul className={styles.imageRows}>
                {detection.images.map((image, index) => {
                  const ocrScore = analyses ? analyses[index].ocrScore : null;
                  return (
                    <li className={styles.imageRow} key={`${image.url}-${index}`}>
                      {brokenUrls.includes(image.url) ? (
                        <span className={styles.rowThumbBroken} role="img" aria-label={`이미지 ${index + 1} 원본을 불러오지 못함`}>
                          <ImageOff aria-hidden="true" />
                          <small>원본을 불러오지 못함</small>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.rowThumb}
                          onClick={() => setViewerUrl(image.url)}
                          aria-label={`이미지 ${index + 1} 원본 크기로 보기`}
                        >
                          {/* 외부 플랫폼 이미지라 호스트를 예측할 수 없어 next/image 대신 img를 쓴다. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt={`이미지 ${index + 1}`}
                            loading="lazy"
                            onError={() => markBroken(image.url)}
                          />
                        </button>
                      )}
                      <div className={styles.rowBody}>
                        <h3 className={styles.rowTitle}>이미지 {index + 1}</h3>

                        <div className={styles.analysisSub}>
                          <p className={styles.analysisSubTitle}>
                            객체 탐지 결과
                            {/* "정상" 표기는 마약 의심 여부로 읽혀서, 객체 검출 여부(검출됨/미검출)로 표현한다. */}
                            {image.detectedObjects.length > 0 ? (
                              <span className={styles.analysisBadge} data-flagged={true}>검출됨</span>
                            ) : (
                              <span className={styles.mutedBadge}>미검출</span>
                            )}
                          </p>
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
                        </div>

                        <div className={styles.analysisSub}>
                          <p className={styles.analysisSubTitle}>
                            이미지 속 텍스트 (OCR)
                            {!image.ocrText && <span className={styles.mutedBadge}>미검출</span>}
                          </p>
                          {image.ocrText && (
                            <>
                              <p className={styles.ocrText}>{image.ocrText}</p>
                              {ocrScore !== null && (
                                <div className={styles.probRow}>
                                  <span className={styles.probLabel}>마약 의심 비율</span>
                                  <div className={styles.probTrack} aria-hidden="true">
                                    <i
                                      className={styles.probFill}
                                      style={{ width: toPercent(ocrScore), background: scoreColors(ocrScore).stroke }}
                                    />
                                  </div>
                                  <strong className={styles.probValue} style={{ color: scoreColors(ocrScore).fg }}>
                                    {toPercent(ocrScore)}
                                  </strong>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.noAnalysis}>첨부된 이미지가 없어 이미지 분석을 수행하지 않았습니다.</p>
            )}
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={styles.asideCard} aria-labelledby="risk-title">
            <h2 className={styles.asideTitle} id="risk-title">분석 요약</h2>
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
                  ) : textAnalysis ? (
                    // 모델 점수 없이 규칙 매칭만 수행된 경우
                    <span className={styles.breakdownText}>
                      {textAnalysis.flagged ? "의심 (규칙 매칭)" : "정상 (점수 없음)"}
                    </span>
                  ) : (
                    <span className={styles.breakdownEmpty}>분석 없음</span>
                  )}
                </dd>
              </div>
              <div className={styles.breakdownRow}>
                <dt>객체</dt>
                <dd>
                  {detectedNames.length > 0 ? (
                    <span className={styles.breakdownText}>
                      {detectedNames[0]}
                      {detectedNames.length > 1 && ` 외 ${detectedNames.length - 1}종`}
                    </span>
                  ) : (
                    <span className={styles.breakdownEmpty}>미검출</span>
                  )}
                </dd>
              </div>
              <div className={styles.breakdownRow}>
                <dt>OCR</dt>
                <dd>
                  {ocrMax !== null ? (
                    <>
                      <i className={styles.breakdownTrack} aria-hidden="true">
                        <b style={{ width: toPercent(ocrMax), background: scoreColors(ocrMax).stroke }} />
                      </i>
                      <span className={styles.breakdownValue} style={{ color: scoreColors(ocrMax).fg }}>{toPercent(ocrMax)}</span>
                    </>
                  ) : (
                    <span className={styles.breakdownEmpty}>미검출</span>
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
          {brokenUrls.includes(viewerUrl) ? (
            <p className={styles.viewerBroken} onClick={(event) => event.stopPropagation()}>
              <ImageOff aria-hidden="true" />
              원본을 불러오지 못했습니다.
              <small>원본이 삭제되었거나 일시적으로 접근할 수 없는 상태일 수 있습니다.</small>
            </p>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={viewerUrl}
              alt="첨부 이미지 원본"
              onClick={(event) => event.stopPropagation()}
              onError={() => markBroken(viewerUrl)}
            />
          )}
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
