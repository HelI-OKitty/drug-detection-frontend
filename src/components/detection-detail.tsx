"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, ImageOff, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { confirmDetection, deleteDetection } from "@/app/detections/[id]/actions";
import {
  STATUS_LABEL,
  missingVerdictReason,
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

export function DetectionDetailNavigation({ sourceUrl }: { sourceUrl: string }) {
  const params = useSearchParams();
  const listHref = `/detections${params.size ? `?${params}` : ""}`;
  const [active, setActive] = useState("post-original");
  const navRef = useRef<HTMLElement>(null);
  const selectedPosition = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      if (selectedPosition.current !== null && Math.abs(window.scrollY - selectedPosition.current) < 2) return;
      selectedPosition.current = null;
      const boundary = (navRef.current?.closest("header")?.getBoundingClientRect().bottom ?? 120) + 32;
      const ids = ["post-original", "text-analysis-title", "image-analysis-title"];
      const review = document.getElementById("action-title");
      const aside = review?.closest("aside");
      // 고정된 검토 패널은 본문과 함께 보여도 현재 읽는 본문 구역을 덮어쓰지 않는다.
      if (aside && getComputedStyle(aside).position !== "sticky") ids.push("action-title");
      let current = ids[0];
      for (const id of ids) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= boundary) current = id;
      }
      setActive(current);
    }
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    window.history.pushState(null, "", `#${id}`);
    selectedPosition.current = window.scrollY;
    setActive(id);
  }

  function sectionLink(id: string, label: string) {
    return <a href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); jump(id);
    }}>{label}</a>;
  }

  return <nav ref={navRef} aria-label="상세 화면 바로가기">
    <Link href={listHref} scroll={false}><ArrowLeft size={16} aria-hidden="true" />목록으로</Link>
    {sectionLink("post-original", "게시글 원문")}
    {sectionLink("text-analysis-title", "텍스트 근거")}
    {sectionLink("image-analysis-title", "이미지 · OCR")}
    <a href={sourceUrl} target="_blank" rel="noreferrer noopener">원문 열기<ExternalLink size={14} aria-hidden="true" /><span className={styles.srOnly}> (새 창)</span></a>
    {sectionLink("action-title", "검토 처리")}
  </nav>;
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
  const imageScores = detection.images.map((image) => image.score).filter(Number.isFinite);
  const imageMax = imageScores.length ? Math.max(...imageScores) : null;

  const imageFlagged = detection.images.length ? detection.images.some((image) => image.flagged) : null;
  const positiveSources = [detection.textFlagged === true ? "텍스트" : null, imageFlagged === true ? "이미지" : null].filter(Boolean);
  const verdictExplanation = detection.isDrug === true && positiveSources.length
    ? `${positiveSources.join("와 ")}에서 양성이 탐지되었습니다.`
    : detection.isDrug === false && positiveSources.length
      ? "종합 판정과 개별 결과가 일치하지 않습니다. 분석 근거를 확인해 주세요."
      : detection.isDrug === true
        ? "양성의 근거가 되는 개별 판정을 확인할 수 없습니다."
        : detection.isDrug === null
          ? "종합 판정이 제공되지 않았습니다."
          : detection.textFlagged === null || imageFlagged === null
            ? "제공된 종합 판정은 음성입니다. 일부 개별 판정은 미제공이며, 음성을 뜻하지 않습니다."
            : "텍스트와 이미지 모두 음성입니다.";

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
      <h1 className={styles.srOnly}>탐지 게시글 검토</h1>

      <section className={styles.verdictSummary} aria-label="분석 판정 요약">
        <div className={styles.overallVerdict}>
          <div><h2>종합 판정</h2><strong data-positive={detection.isDrug === true}>{detection.isDrug === null ? "판정 미제공" : detection.isDrug ? "양성" : "음성"}</strong></div>
          <p>{verdictExplanation}</p>
        </div>
        <div className={styles.componentVerdicts}>
          <div>
            <span className={styles.verdictHeading}>텍스트 판정</span>
            <div className={styles.verdictResult}>
              <strong data-positive={detection.textFlagged === true}>{detection.textFlagged === null ? "미제공" : detection.textFlagged ? "양성" : "음성"}</strong>
              {textScore !== null && <div className={styles.summaryScore}><b style={{ color: scoreColors(textScore).fg }}>{toPercent(textScore, 2)}</b><span>모델 점수</span></div>}
            </div>
            {textScore === null && <small>{detection.textFlagged === null ? missingVerdictReason(textAnalysis?.source) : textAnalysis?.source === "rule" ? "규칙 · 사전 매칭" : "모델 점수 미제공"}</small>}
          </div>
          <div>
            <span className={styles.verdictHeading}>이미지 판정{detection.images.length > 0 && ` · ${detection.images.length}장`}</span>
            <div className={styles.verdictResult}>
              <strong data-positive={imageFlagged === true}>{imageFlagged === null ? "미제공" : imageFlagged ? "양성" : "음성"}</strong>
              {imageMax !== null && <div className={styles.summaryScore}><b style={{ color: scoreColors(imageMax).fg }}>{toPercent(imageMax, 2)}</b><span>{detection.images.length > 1 ? "이미지 마약 확률 · 최댓값" : "이미지 마약 확률"}</span></div>}
            </div>
            {imageMax === null && <small>해당 게시글에는 이미지가 없습니다.</small>}
          </div>
        </div>
      </section>
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
                <span className={styles.analysisBadge} data-flagged={textAnalysis.flagged ?? undefined}>
                  {textAnalysis.flagged === null ? "텍스트 판정 미제공" : textAnalysis.flagged ? "텍스트 양성" : "텍스트 음성"}
                </span>
              )}
            </header>
            {textAnalysis ? (
              <>
                <p className={styles.evidenceNote}>판정 방식: {textAnalysis.source === "rule" ? "규칙 · 사전 매칭" : textAnalysis.source === "model" ? "AI 모델" : textAnalysis.source === "no_supported_characters" ? "분석 가능한 문자 없음" : textAnalysis.source ?? "미제공"}</p>
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
                ) : textAnalysis.flagged === null || textAnalysis.source !== "rule" ? (
                  <p className={styles.ruleNote}>
                    {textAnalysis.flagged === null ? missingVerdictReason(textAnalysis.source) : textAnalysis.source === "model" ? "모델로 판정되었습니다. 확률 점수는 제공되지 않습니다." : "판정 방식과 확률 점수가 제공되지 않았습니다."}
                  </p>
                ) : null}
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
              <><p className={styles.evidenceNote}>이미지를 선택하면 원본을 볼 수 있습니다.</p><ul className={styles.imageRows}>
                {detection.images.map((image, index) => {
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
                          <p className={styles.analysisSubTitle}>이미지 마약 확률</p>
                          <div className={styles.probRow}>
                            <div className={styles.probTrack} aria-hidden="true"><i className={styles.probFill} style={{ width: toPercent(image.score), background: scoreColors(image.score).stroke }} /></div>
                            <strong className={styles.probValue} style={{ color: scoreColors(image.score).fg }}>{toPercent(image.score, 2)}</strong>
                          </div>
                          <p className={styles.ocrDisclaimer}>이미지 전체에 마약이 포함되어 있을 확률입니다.</p>
                        </div>
                        <div className={styles.analysisSub}>
                          <p className={styles.analysisSubTitle}>
                            검출 객체 · 분류 확률
                            {/* "정상" 표기는 마약 의심 여부로 읽혀서, 객체 검출 여부(검출됨/미검출)로 표현한다. */}
                            {image.detectedObjects.length > 0 ? (
                              <span className={styles.analysisBadge} data-flagged={true}>검출됨</span>
                            ) : (
                              <span className={styles.mutedBadge}>미검출</span>
                            )}
                          </p>
                          {image.detectedObjects.length > 0 && <p className={styles.ocrDisclaimer}>검출된 객체가 표시된 마약 종류에 해당할 확률입니다.</p>}
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
                          {image.ocrResults.map((ocr, ocrIndex) => (
                            <div key={ocrIndex}>
                              <p className={styles.ocrText}>{ocr.text}</p>
                              <p className={styles.ocrDisclaimer}>{ocr.flagged === null ? missingVerdictReason(ocr.source) : ocr.flagged ? "OCR 판정 · 양성" : "OCR 판정 · 음성"}</p>
                              {ocr.probDrug !== null && <div className={styles.probRow}>
                                <span className={styles.probLabel}>마약 의심 비율</span>
                                <div className={styles.probTrack} aria-hidden="true"><i className={styles.probFill} style={{ width: toPercent(ocr.probDrug), background: scoreColors(ocr.probDrug).stroke }} /></div>
                                <strong className={styles.probValue} style={{ color: scoreColors(ocr.probDrug).fg }}>{toPercent(ocr.probDrug, 2)}</strong>
                              </div>}
                              {ocr.matchedTerms.length > 0 && <p className={styles.ocrDisclaimer}>매칭 용어: {ocr.matchedTerms.join(", ")}</p>}
                              {ocr.matchedIntents.length > 0 && <p className={styles.ocrDisclaimer}>매칭 의도: {ocr.matchedIntents.join(", ")}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul></>
            ) : (
              <p className={styles.noAnalysis}>해당 게시글에는 이미지가 존재하지 않습니다.</p>
            )}
          </section>
        </div>

        <aside className={`${styles.aside} ${styles.reviewAside}`}>
          <section className={`${styles.asideCard} ${styles.reviewCard}`} aria-labelledby="action-title">
            <div className={styles.reviewCardHeader}><h2 id="action-title">검토 처리</h2><span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span></div>
            <p className={styles.evidenceNote}>검토 확정은 AI 판정을 변경하지 않습니다.</p>
            <button type="button" className={styles.confirmButton} onClick={handleConfirm} disabled={status === "confirmed" || pending !== null}>
              <Check aria-hidden="true" />{pending === "confirm" ? "저장 중…" : status === "confirmed" ? "검토 확정됨" : "검토 확정"}
            </button>
            <p className={error ? styles.actionError : styles.actionNote} role="status">{error || (status === "confirmed" ? "검토가 확정되었습니다." : "")}</p>
            <div className={styles.deleteArea}>
              <div><strong>게시글 삭제</strong><p>이 기록을 완전히 삭제합니다. 되돌릴 수 없습니다.</p></div>
              <button type="button" aria-label="게시글 삭제" title="게시글 삭제" onClick={() => setConfirmOpen(true)} disabled={pending !== null}><Trash2 size={15} aria-hidden="true" /></button>
            </div>
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
              {detection.adminId && (
                <div className={styles.metaRow}><dt>담당 관리자 ID</dt><dd>{detection.adminId}</dd></div>
              )}
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
