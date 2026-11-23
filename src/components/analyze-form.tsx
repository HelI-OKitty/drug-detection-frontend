"use client";

import { ArrowLeft, ChevronDown, FileText, ImagePlus, Info, ScanSearch, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { scoreColors, toPercent } from "@/lib/detections";
import { analyzeContent, type AnalysisSource, type AnalyzeResult } from "@/lib/text-detector";
import viewerStyles from "./detections.module.css";
import styles from "./settings.module.css";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type PickedImage = { id: string; name: string; dataUrl: string; base64: string; bytes: number };

function Score({ label, value }: { label: string; value: number | null }) {
  return <div className={styles.probRow}>
    <span className={styles.probLabel}>{label}</span>
    {value === null ? <span className={styles.itemMeta}>점수 미제공</span> : <>
      <i className={styles.probTrack} aria-hidden="true"><b style={{ width: toPercent(value, 2), background: scoreColors(value).stroke }} /></i>
      <strong className={styles.probValue}>{toPercent(value, 2)}</strong>
    </>}
  </div>;
}
function Verdict({ positive }: { positive: boolean | null }) {
  if (positive === null) return <span className={styles.itemBadge} data-tone="muted">판정 미제공</span>;
  return <span className={styles.itemBadge} data-tone={positive ? "danger" : "safe"}>{positive ? "양성" : "음성"}</span>;
}
function SourceTag({ source }: { source: AnalysisSource }) {
  if (source === "model") return <span className={styles.sourceTag}>AI 모델</span>;
  if (source === "rule") return <span className={styles.sourceTag}>규칙 매칭</span>;
  return null;
}
// 규칙 판정에서 걸린 키워드·의도를 평문 대신 칩으로 보여준다. 매칭이 하나도 없으면 아예 렌더하지 않는다.
function MatchTags({ terms, intents }: { terms: string[]; intents: string[] }) {
  if (!terms.length && !intents.length) return null;
  return (
    <div className={styles.matchGroups}>
      {terms.length > 0 && <div className={styles.matchGroup}>
        <span className={styles.matchGroupLabel}>매칭 용어</span>
        <span className={styles.matchTags}>{terms.map((term, i) => <span key={`${term}-${i}`} className={styles.matchTag} data-kind="term">{term}</span>)}</span>
      </div>}
      {intents.length > 0 && <div className={styles.matchGroup}>
        <span className={styles.matchGroupLabel}>매칭 의도</span>
        <span className={styles.matchTags}>{intents.map((intent, i) => <span key={`${intent}-${i}`} className={styles.matchTag} data-kind="intent">{intent}</span>)}</span>
      </div>}
    </div>
  );
}
// 분석 불가(no_supported_characters) 입력 안내. 원인과 다음 행동을 함께 보여준다.
// retry=true면 사용자가 직접 고칠 수 있는 입력 텍스트라 재입력을 유도한다(OCR 추출 문구는 제외).
function UnsupportedNote({ retry }: { retry?: boolean }) {
  return (
    <div className={styles.unsupportedNote} role="status">
      <span className={styles.unsupportedIcon} aria-hidden="true"><Info /></span>
      <div className={styles.unsupportedBody}>
        <strong className={styles.unsupportedTitle}>분석할 수 있는 텍스트가 아니에요</strong>
        <p className={styles.unsupportedDetail}>
          특수문자·숫자·이모지만 있어 판정할 단어를 찾지 못했어요.{retry && " 한글이나 영문이 포함된 문장을 입력해 주세요."}
        </p>
        {retry && <p className={styles.unsupportedExample}>예: <b>이 약 어디서 구할 수 있나요?</b></p>}
      </div>
    </div>
  );
}
// 입력 텍스트·OCR 추출 문구를 같은 접기/펼치기 상자로 보여준다.
function DisclosureText({ text, label = "추출 문구", empty = "추출 문구가 없습니다." }: { text: string; label?: string; empty?: string }) {
  if (!text.trim()) return <p className={styles.subEmpty}>{empty}</p>;
  return (
    <details className={styles.ocrDisclosure}>
      <summary><span className={styles.ocrDisclosureLabel}><FileText aria-hidden="true" />{label}</span><span className={styles.ocrDisclosureAction}><span className={styles.ocrExpand}>보기</span><span className={styles.ocrCollapse}>접기</span><ChevronDown aria-hidden="true" /></span></summary>
      <p className={styles.ocrText}>{text}</p>
    </details>
  );
}

function readImage(file: File): Promise<PickedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        bytes: file.size,
        dataUrl,
        // API는 data URL 접두사 없는 순수 base64를 받는다.
        base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
      });
    };
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export default function AnalyzeForm({ title = "단순 분석", hideIntro = false }: { title?: string; hideIntro?: boolean }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const readingFiles = useRef(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalyzeResult | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const inputHeading = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showOutcome) {
      outcomeHeading.current?.focus();
      outcomeHeading.current?.scrollIntoView({ block: "start" });
    }
  }, [showOutcome, pending]);

  function returnToInput(clear: boolean) {
    resetOutcome();
    setViewerUrl(null);
    if (clear) {
      setText("");
      setImages([]);
    }
    setShowOutcome(false);
    requestAnimationFrame(() => inputHeading.current?.focus());
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

  function resetOutcome() {
    setResults(null);
    setError("");
  }

  // 파일 선택·드래그앤드롭 양쪽에서 같은 검증·읽기 경로를 쓴다.
  async function addFiles(files: File[]) {
    if (readingFiles.current || inFlight.current) return;
    if (files.length === 0) return;
    resetOutcome();
    readingFiles.current = true;
    setReading(true);
    let totalBytes = images.reduce((sum, image) => sum + image.bytes, 0);

    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError(`이미지는 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`);
    const picked: PickedImage[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 추가할 수 있습니다.");
        continue;
      }
      if (totalBytes + file.size > MAX_IMAGE_BYTES) {
        setError("이미지는 합계 3MB 이하로 추가해 주세요.");
        continue;
      }
      try {
        picked.push(await readImage(file));
        totalBytes += file.size;
      } catch {
        setError("이미지를 읽지 못했습니다. 다른 파일로 시도해 주세요.");
      }
    }
    if (picked.length > 0) setImages((current) => [...current, ...picked]);
    readingFiles.current = false;
    setReading(false);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addFiles(files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (pending || reading || images.length >= MAX_IMAGES) return;
    void addFiles(Array.from(event.dataTransfer.files));
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    // 드롭을 허용하려면 dragover에서 기본 동작을 막아야 한다.
    event.preventDefault();
    if (!pending && !reading && images.length < MAX_IMAGES) setDragging(true);
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
    resetOutcome();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAnalysis();
  }

  async function runAnalysis() {
    if (inFlight.current || readingFiles.current) return;
    resetOutcome();
    if (!text.trim() && images.length === 0) {
      setError("분석할 텍스트를 입력하거나 이미지를 추가해 주세요.");
      return;
    }
    inFlight.current = true;
    if (hideIntro) setShowOutcome(true);
    setPending(true);
    try {
      setResults(await analyzeContent({ text, images: images.map((image) => image.base64) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const canSubmit = !pending && !reading && (Boolean(text.trim()) || images.length > 0);
  // 텍스트 모델이 처리할 수 없는 입력. 안내만 하고 판정·점수·매칭은 보여주지 않는다.
  const textUnsupported = results?.textResult?.source === "no_supported_characters";
  // 텍스트만 입력했는데 분석 불가면 종합 판정 카드를 숨기고 폼 쪽 안내로 대신한다.
  const unsupportedOnly = Boolean(results && textUnsupported && results.imageResults.length === 0);
  const textResultMissing = Boolean(results && text.trim() && !textUnsupported && results.textResult?.isDrug == null);
  const needsRetry = Boolean(error || textResultMissing || textUnsupported);

  return (
    <div className={`${styles.page} ${hideIntro ? styles.trialForm : ""}`}>
      {showOutcome && <header className={styles.outcomeHeader}>
        <h2 ref={outcomeHeading} tabIndex={-1}>{pending ? "분석 중" : error ? "분석 실패" : unsupportedOnly ? "분석할 수 없는 텍스트" : "분석 결과"}</h2>
        {(pending || needsRetry) && <p>{pending ? "결과를 확인하고 있습니다. 잠시만 기다려 주세요." : error ? error : unsupportedOnly ? "입력 내용을 수정한 뒤 다시 분석해 주세요." : textResultMissing ? "텍스트 판정이 누락되었습니다. 다시 시도해 주세요." : "텍스트를 분석하지 못했습니다. 이미지 결과를 확인하거나 입력을 수정해 주세요."}</p>}
      </header>}
      {!showOutcome && <form className={styles.formStack} onSubmit={handleSubmit}>
        <section className={styles.card} aria-labelledby={hideIntro ? undefined : "analyze-title"} aria-label={hideIntro ? "게시글 분석" : undefined}>
          {!hideIntro && <header className={styles.cardHeader}>
            <h2 id="analyze-title"><ScanSearch aria-hidden="true" />{title}</h2>
          </header>}
          <div className={styles.cardBody}>
            {!hideIntro && <p className={styles.help}>텍스트나 이미지를 입력하면 분석 결과를 확인할 수 있습니다.</p>}
            <div className={styles.field}>
              <label htmlFor="analyze-text">{hideIntro ? <>텍스트 <span>선택</span></> : "분석할 텍스트 (선택)"}</label>
              <textarea
                ref={inputHeading}
                id="analyze-text"
                rows={4}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  resetOutcome();
                }}
                placeholder="분석할 게시글이나 문장을 입력하거나 붙여넣으세요."
                disabled={pending || reading}
                className={styles.textarea}
              />
            </div>

            <div className={`${styles.field} ${styles.imageField}`}>
              <label htmlFor="analyze-images">{hideIntro ? <>이미지 <span>선택</span></> : `이미지 (선택, 최대 ${MAX_IMAGES}장 · 전체 3MB 이하)`}</label>
              <input
                ref={fileInput}
                id="analyze-images"
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFiles}
                disabled={pending || reading}
              />
              <div
                className={styles.dropZone}
                data-dragging={dragging}
                data-disabled={pending || reading || images.length >= MAX_IMAGES}
                role="button"
                tabIndex={pending || reading || images.length >= MAX_IMAGES ? -1 : 0}
                aria-label="이미지 추가 — 클릭하거나 파일을 끌어다 놓기"
                onClick={() => !(pending || reading || images.length >= MAX_IMAGES) && fileInput.current?.click()}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !(pending || reading || images.length >= MAX_IMAGES)) {
                    event.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
                onDrop={handleDrop}
              >
                <ImagePlus aria-hidden="true" />
                <span className={styles.dropZoneText}>
                  {images.length >= MAX_IMAGES
                    ? `이미지는 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다`
                    : hideIntro ? <><strong>파일 선택</strong> 또는 여기로 이미지 끌어놓기</> : <><strong>이미지를 끌어다 놓거나 클릭</strong>해 추가</>}
                </span>
                {images.length < MAX_IMAGES && <small>최대 {MAX_IMAGES}장 · 전체 3MB 이하</small>}
              </div>
              {images.length > 0 && (
                <ul className={styles.thumbGrid}>
                  {images.map((image) => (
                    <li key={image.id} className={styles.thumbItem}>
                      {/* 로컬 미리보기 data URL이라 next/image를 쓰지 않는다. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.dataUrl} alt={image.name} />
                      <button
                        type="button"
                        className={styles.thumbRemove}
                        onClick={() => removeImage(image.id)}
                        disabled={pending || reading}
                        aria-label={`${image.name} 제거`}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <div className={styles.footer}>
          <p role="status" aria-live="polite" aria-atomic="true" className={error ? styles.error : styles.savedNote}>
            {pending ? "텍스트와 이미지를 분석하고 있습니다. 잠시만 기다려 주세요…" : reading ? "이미지를 읽고 있습니다…" : error || (hideIntro ? "텍스트나 이미지 중 하나만 입력해도 됩니다." : "")}
          </p>
          <button type="submit" className={styles.saveButton} disabled={!canSubmit}>
            <ScanSearch aria-hidden="true" />{pending ? "분석 중…" : "분석하기"}
          </button>
        </div>
      </form>}

      {unsupportedOnly && <UnsupportedNote retry />}

      {results && !unsupportedOnly && (
        <section className={styles.resultCard} data-tone={results.isDrug ? "danger" : textResultMissing ? "muted" : "safe"} aria-labelledby="overall-title" aria-live="polite">
          <div className={styles.resultHead}>
            <span className={styles.resultIcon} aria-hidden="true">{results.isDrug || textResultMissing ? <TriangleAlert /> : <ShieldCheck />}</span>
            <h2 id="overall-title" className={styles.resultTitle}>종합 판정 · {results.isDrug ? "양성" : textResultMissing ? "확인 필요" : "음성"}</h2>
          </div>
          <p className={styles.itemMeta}>텍스트 또는 이미지 중 하나라도 양성이면 종합 양성으로 판단합니다.</p>
          {textResultMissing && <p className={styles.itemMeta}>텍스트 판정이 누락되었습니다. 다시 분석해 주세요.</p>}
          <div className={styles.analysisColumns} data-split={Boolean(text.trim() && results.imageResults.length)}>
            {Boolean(text.trim()) && <section className={styles.analysisPanel}>
              <div className={styles.analysisPanelHeader}>
              <span className={styles.itemIcon} aria-hidden="true"><FileText /></span>
              <h3 className={styles.itemTitle}>텍스트 분석 {!textUnsupported && <><Verdict positive={results.textResult?.isDrug ?? null} /><SourceTag source={results.textResult?.source ?? null} /></>}</h3>
              </div>
              <div className={styles.itemBody}>
                {textUnsupported ? <UnsupportedNote retry /> : <>
                  <DisclosureText text={text} label="입력한 텍스트" empty="입력한 텍스트가 없습니다." />
                  {results.textResult ? <>
                    {results.textResult.source !== "rule" && <Score label="텍스트 마약 확률" value={results.textResult.score} />}
                    <MatchTags terms={results.textResult.matchedTerms} intents={results.textResult.matchedIntents} />
                  </> : <p className={styles.subEmpty}>텍스트 분석 결과 미제공</p>}
                </>}
              </div>
            </section>}
            {results.imageResults.length > 0 && <ul className={styles.imageResultList}>
            {results.imageResults.map((result, index) => (
              <li key={images[index].id} className={styles.analysisPanel}>
                <div className={styles.analysisPanelHeader}>
                <button type="button" className={styles.thumbZoom} onClick={() => setViewerUrl(images[index].dataUrl)} aria-label={`이미지 ${index + 1} 원본 크기로 보기`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.itemThumb} src={images[index].dataUrl} alt={images[index].name} />
                </button>
                <div className={styles.imageResultHeading}>
                  <h3 className={styles.itemTitle}>이미지 {index + 1}<Verdict positive={result.isDrug} /></h3>
                  <p className={styles.itemMeta}>{images[index].name}</p>
                </div>
                </div>
                <div className={styles.itemBody}>
                  <Score label="이미지 탐지 점수" value={result.score} />
                  <div className={styles.subBlock}>
                    <h4 className={styles.subTitle}>객체 탐지 결과 · {result.detectedObjects.length}개</h4>
                    {result.detectedObjects.length ? <ul className={styles.objectList}>
                      {result.detectedObjects.map((object, i) => <li key={`${object.className}-${i}`} className={styles.objectRow}>
                        <span className={styles.objectName} title={object.className}>{object.className}</span>
                        <span className={styles.itemMeta}>신뢰도</span><strong className={styles.probValue}>{object.confidence === null ? "미제공" : toPercent(object.confidence, 2)}</strong>
                      </li>)}
                    </ul> : <p className={styles.subEmpty}>탐지된 객체가 없습니다.</p>}
                  </div>
                  <div className={styles.subBlock}>
                    <h4 className={styles.subTitle}>이미지 속 텍스트 (OCR)</h4>
                    {result.ocrResults.length > 0 ? result.ocrResults.map((ocr, ocrIndex) => {
                      const ocrUnsupported = ocr.source === "no_supported_characters";
                      return (
                      <div key={ocrIndex} className={styles.subBlock}>
                        <p className={styles.subTitle}>OCR 분석 {ocrIndex + 1}{!ocrUnsupported && <><Verdict positive={ocr.isDrug} /><SourceTag source={ocr.source} /></>}</p>
                        {ocrUnsupported ? <UnsupportedNote /> : <>
                          {ocr.source !== "rule" && <Score label="OCR 마약 확률" value={ocr.score} />}
                          <DisclosureText text={ocr.text} />
                          <MatchTags terms={ocr.matchedTerms} intents={ocr.matchedIntents} />
                        </>}
                      </div>
                      );
                    }) : result.ocrText.trim() ? <DisclosureText text={result.ocrText} /> : <p className={styles.subEmpty}>OCR 결과가 없습니다.</p>}
                  </div>
                </div>
              </li>
            ))}
            </ul>}
          </div>
        </section>
      )}

      {showOutcome && !pending && <div className={styles.outcomeActions}>
        {needsRetry ? <>
          <button type="button" className={styles.editInputButton} onClick={() => returnToInput(false)}><ArrowLeft aria-hidden="true" />입력 수정하기</button>
          <button type="button" className={styles.saveButton} onClick={() => void runAnalysis()}>다시 시도</button>
        </> : <button type="button" className={styles.saveButton} onClick={() => returnToInput(true)}>새로 분석하기</button>}
      </div>}

      {viewerUrl && (
        <div
          className={viewerStyles.viewerOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="이미지 원본 보기"
          onClick={() => setViewerUrl(null)}
        >
          <button type="button" className={viewerStyles.viewerClose} onClick={() => setViewerUrl(null)} aria-label="닫기">
            <X aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewerUrl} alt="이미지 원본" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
