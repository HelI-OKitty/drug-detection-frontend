"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, FileText, Images, ImageOff, ScanText, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
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
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (confirmOpen) deleteDialog.current?.showModal();
  }, [confirmOpen]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const listHref = `/detections${searchParams.size ? `?${searchParams}` : ""}`;

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
      router.push(listHref);
      router.refresh();
      return;
    }
    setError(result.message);
    setPending(null);
    setConfirmOpen(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.detailTopline}>
        <Link href={listHref} className={styles.backLink}><ArrowLeft aria-hidden="true" />필터를 유지하고 목록으로</Link>
        <a className={styles.originalLink} href={detection.sourceUrl} target="_blank" rel="noreferrer noopener">원문 열기<ExternalLink size={15} aria-hidden="true" /><span className={styles.srOnly}> (새 창)</span></a>
      </div>
      <div className={styles.detailHeading}><div><h1>탐지 게시글 검토</h1><p>원문과 분석 근거를 확인한 뒤 검토 상태를 확정하세요.</p></div><span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span></div>

      <section className={styles.verdictOverview} aria-label="판정 및 검토 요약">
        <div><span>종합 판정</span><strong data-positive={detection.isDrug === true}>{detection.isDrug === null ? "판정 미제공" : detection.isDrug ? "양성" : "음성"}</strong><small>서버의 종합 분석 결과</small></div>
        <div><span>텍스트 판정</span><strong data-positive={detection.textFlagged === true}>{detection.textFlagged === null ? "미제공" : detection.textFlagged ? "양성" : "음성"}</strong><small>게시글 텍스트 분석</small></div>
        <div><span>이미지 판정</span><strong data-positive={detection.images.some((image) => image.flagged)}>{!detection.images.length ? "미제공" : detection.images.some((image) => image.flagged) ? "양성" : "음성"}</strong><small>이미지 객체 탐지</small></div>
        <div><span>OCR 판정</span><strong className={styles.pendingVerdict}>연동 대기</strong><small>추출 텍스트와 별도 판정</small></div>
        <div><span>검토 상태</span><strong>{STATUS_LABEL[status]}</strong><small>AI 판정과 별도로 관리</small></div>
      </section>
      <nav className={styles.evidenceNav} aria-label="분석 근거 바로가기">
        <a href="#post-original"><FileText size={16} aria-hidden="true" />게시글 원문</a>
        <a href="#text-analysis-title"><ScanText size={16} aria-hidden="true" />텍스트 근거</a>
        <a href="#image-analysis-title"><Images size={16} aria-hidden="true" />이미지 · OCR <span>{detection.images.length}</span></a>
      </nav>
      <div className={`${styles.detailLayout} ${styles.reviewLayout}`}>
        <div className={styles.mainColumn}>
          <article className={styles.postCard} id="post-original" aria-labelledby="post-title">
            <h2 className={styles.evidenceTitle} id="post-title">게시글 원문</h2>
            <header className={styles.postHeader}>
              <div className={styles.postIdentity}>
                <strong>{detection.nickname}</strong>
                <span>{detection.platform} · 게시 {detection.postedAt}</span>
              </div>
              <span className={styles.platformTag}>{detection.platform}</span>
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
              <h2 className={styles.asideTitle} id="text-analysis-title">텍스트 분석 근거</h2>
              {textAnalysis && (
                <span className={styles.analysisBadge} data-flagged={textAnalysis.flagged}>
                  {textAnalysis.flagged ? "텍스트 양성" : "텍스트 음성"}
                </span>
              )}
            </header>
            {textAnalysis ? (
              <>
                <p className={styles.evidenceNote}>판정 방식: {textAnalysis.source === "rule" ? "규칙 · 사전 매칭" : textAnalysis.source === "model" ? "AI 모델" : "미제공"}. 모델 점수와 사전 매칭 결과를 함께 확인하세요.</p>
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
                      {toPercent(textAnalysis.probDrug, 2)}
                    </strong>
                  </div>
                ) : (
                  <p className={styles.ruleNote}>
                    {textAnalysis.source === "rule" ? "규칙(사전 매칭)으로 판정되었습니다." : textAnalysis.source === "model" ? "모델로 판정되었습니다. 확률 점수는 제공되지 않습니다." : "판정 방식과 확률 점수가 제공되지 않았습니다."}
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
              <h2 className={styles.asideTitle} id="image-analysis-title">이미지 · OCR 분석 근거</h2>
            </header>
            {detection.images.length > 0 ? (
              <><p className={styles.evidenceNote}>이미지를 누르면 원본 크기로 볼 수 있습니다. 객체의 검출 신뢰도와 OCR 텍스트를 각각 확인하세요.</p><ul className={styles.imageRows}>
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
                        <div className={styles.imageEvidenceTitle}><h3 className={styles.rowTitle}>이미지 {index + 1}</h3><span className={styles.analysisBadge} data-flagged={image.flagged}>{image.flagged ? "이미지 양성" : "이미지 음성"}</span></div>

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
                            <span className={styles.mutedBadge}>{image.ocrText ? "텍스트 추출됨" : "추출 텍스트 없음"}</span>
                          </p>
                          {image.ocrText && (
                            <>
                              <p className={styles.ocrText}>{image.ocrText}</p>
                              <p className={styles.ocrDisclaimer}>추출된 문구이며 OCR 양성 판정은 아닙니다. 별도 판정은 아직 제공되지 않습니다.</p>
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
                                    {toPercent(ocrScore, 2)}
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
              </ul></>
            ) : (
              <p className={styles.noAnalysis}>제공된 이미지 분석 결과가 없습니다.</p>
            )}
          </section>
        </div>

        <aside className={`${styles.aside} ${styles.reviewAside}`}>
          <section className={`${styles.asideCard} ${styles.reviewCard}`} aria-labelledby="action-title">
            <div className={styles.reviewCardHeader}><h2 id="action-title">검토 처리</h2><span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span></div>
            <p className={styles.evidenceNote}>원문과 분석 근거를 검토한 뒤 확정하세요. AI의 양성·음성 판정은 변경되지 않습니다.</p>
            <button type="button" className={styles.confirmButton} onClick={handleConfirm} disabled={status === "confirmed" || pending !== null}>
              <Check aria-hidden="true" />{pending === "confirm" ? "저장 중…" : status === "confirmed" ? "검토 확정됨" : "검토 확정"}
            </button>
            <p className={error ? styles.actionError : styles.actionNote} role="status">{error || (status === "confirmed" ? "검토 상태가 확정으로 저장되었습니다." : "확정 시 검토 상태를 서버에 저장합니다.")}</p>
            <div className={styles.deleteArea}>
              <div><strong>게시글 삭제</strong><p>이 기록을 완전히 삭제합니다. 되돌릴 수 없습니다.</p></div>
              <button type="button" onClick={() => setConfirmOpen(true)} disabled={pending !== null}><Trash2 size={15} aria-hidden="true" />삭제…</button>
            </div>
          </section>
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
                      <span className={styles.breakdownValue} style={{ color: scoreColors(textScore).fg }}>{toPercent(textScore, 2)}</span>
                    </>
                  ) : textAnalysis ? (
                    // 모델 점수 없이 규칙 매칭만 수행된 경우
                    <span className={styles.breakdownText}>
                      {textAnalysis.flagged ? "의심" : "정상"} (점수 없음)
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
                    <span className={styles.breakdownEmpty}>{detection.images.length ? "미검출" : "미제공"}</span>
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
                      <span className={styles.breakdownValue} style={{ color: scoreColors(ocrMax).fg }}>{toPercent(ocrMax, 2)}</span>
                    </>
                  ) : (
                    <span className={styles.breakdownEmpty}>판정 미제공</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className={styles.asideCard} aria-labelledby="meta-title">
            <h2 className={styles.asideTitle} id="meta-title">수집 정보</h2>
            <dl className={styles.metaList}>
              <div className={styles.metaRow}><dt>게시글 ID</dt><dd>{detection.id}</dd></div>
              <div className={styles.metaRow}><dt>게시 시각</dt><dd>{detection.postedAt}</dd></div>
              <div className={styles.metaRow}><dt>탐지 시각</dt><dd>{detection.detectedAt}</dd></div>
              <div className={styles.metaRow}>
                <dt>원문 링크</dt>
                <dd>
                  <a href={detection.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {shortUrl(detection.sourceUrl)}
                  </a>
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>검토 상태</dt>
                <dd><span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span></dd>
              </div>
            </dl>
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
        <dialog ref={deleteDialog} className={styles.deleteDialog} onCancel={(event) => { if (pending !== null) event.preventDefault(); else setConfirmOpen(false); }} aria-labelledby="delete-title" aria-describedby="delete-desc">
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-title">탐지 게시글을 삭제할까요?</h2>
            <p id="delete-desc">
              이 탐지 게시글을 서버에서 삭제합니다.
              <br />삭제한 데이터는 복구할 수 없습니다. 계속할까요?
            </p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={pending !== null}>취소</button>
              <button type="button" className={styles.modalDelete} onClick={handleDelete} disabled={pending !== null}>
                {pending === "delete" ? "삭제 중…" : "삭제"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
