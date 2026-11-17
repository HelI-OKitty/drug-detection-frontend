"use client";

import { ChevronDown, FileText, ImagePlus, ScanSearch, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { scoreColors, toPercent } from "@/lib/detections";
import { analyzeContent, type AnalyzeResult } from "@/lib/text-detector";
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
function OcrText({ text }: { text: string }) {
  if (!text.trim()) return <p className={styles.subEmpty}>추출 문구가 없습니다.</p>;
  return (
    <details className={styles.ocrDisclosure}>
      <summary><span className={styles.ocrDisclosureLabel}><FileText aria-hidden="true" />추출 문구</span><span className={styles.ocrDisclosureAction}><span className={styles.ocrExpand}>보기</span><span className={styles.ocrCollapse}>접기</span><ChevronDown aria-hidden="true" /></span></summary>
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

export default function AnalyzeForm({ title = "단순 분석" }: { title?: string }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const readingFiles = useRef(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalyzeResult | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

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

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    if (readingFiles.current || inFlight.current) return;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
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

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
    resetOutcome();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || readingFiles.current) return;
    resetOutcome();
    if (!text.trim() && images.length === 0) {
      setError("분석할 텍스트를 입력하거나 이미지를 추가해 주세요.");
      return;
    }
    inFlight.current = true;
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
  const textResultMissing = Boolean(results && text.trim() && results.textResult?.isDrug == null);

  return (
    <div className={styles.page}>
      <form className={styles.formStack} onSubmit={handleSubmit}>
        <section className={styles.card} aria-labelledby="analyze-title">
          <header className={styles.cardHeader}>
            <h2 id="analyze-title"><ScanSearch aria-hidden="true" />{title}</h2>
            <small>텍스트 {text.length.toLocaleString("ko-KR")}자 · 이미지 {images.length}/{MAX_IMAGES}</small>
          </header>
          <div className={styles.cardBody}>
            <p className={styles.help}>텍스트와 이미지를 함께 분석합니다. 게시글의 종합 판정과 텍스트·이미지별 결과를 나누어 확인할 수 있습니다.</p>
            <div className={styles.field}>
              <label htmlFor="analyze-text">분석할 텍스트 (선택)</label>
              <textarea
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

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label htmlFor="analyze-images">이미지 (선택, 최대 {MAX_IMAGES}장 · 전체 3MB 이하)</label>
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
              <div>
                <button
                  type="button"
                  className={styles.addImage}
                  onClick={() => fileInput.current?.click()}
                  disabled={pending || reading || images.length >= MAX_IMAGES}
                >
                  <ImagePlus aria-hidden="true" />이미지 추가
                </button>
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
            {pending ? "텍스트와 이미지를 분석하고 있습니다. 잠시만 기다려 주세요…" : reading ? "이미지를 읽고 있습니다…" : error}
          </p>
          <button type="submit" className={styles.saveButton} disabled={!canSubmit}>
            <ScanSearch aria-hidden="true" />{pending ? "분석 중…" : "분석하기"}
          </button>
        </div>
      </form>

      {results && (
        <section className={styles.resultCard} data-tone={results.isDrug ? "danger" : textResultMissing ? "muted" : "safe"} aria-labelledby="overall-title" aria-live="polite">
          <div className={styles.resultHead}>
            <span className={styles.resultIcon} aria-hidden="true">{results.isDrug || textResultMissing ? <TriangleAlert /> : <ShieldCheck />}</span>
            <h2 id="overall-title" className={styles.resultTitle}>종합 판정 · {results.isDrug ? "양성" : textResultMissing ? "확인 필요" : "음성"}</h2>
          </div>
          {textResultMissing && <p className={styles.itemMeta}>텍스트 판정이 누락되었습니다. 다시 분석해 주세요.</p>}
          <div className={styles.analysisColumns} data-split={Boolean(text.trim() && results.imageResults.length)}>
            {Boolean(text.trim()) && <section className={styles.analysisPanel}>
              <div className={styles.analysisPanelHeader}>
              <span className={styles.itemIcon} aria-hidden="true"><FileText /></span>
              <h3 className={styles.itemTitle}>텍스트 분석 <Verdict positive={results.textResult?.isDrug ?? null} /></h3>
              </div>
              <div className={styles.itemBody}>
                <h4 className={styles.subTitle}>입력한 텍스트</h4>
                <p className={styles.inputTextResult}>{text}</p>
                {results.textResult ? <>
                  <p className={styles.ruleNote}>{results.textResult.source === "rule" ? "규칙 · 사전 매칭으로 판정했습니다." : results.textResult.source === "model" ? "AI 모델로 분석했습니다." : "판정 방식이 제공되지 않았습니다."}</p>
                  <Score label="텍스트 마약 확률" value={results.textResult.score} />
                  <p className={styles.itemMeta}>매칭 용어: {results.textResult.matchedTerms.join(", ") || "없음"}</p>
                  <p className={styles.itemMeta}>매칭 의도: {results.textResult.matchedIntents.join(", ") || "없음"}</p>
                </> : <p className={styles.subEmpty}>텍스트 분석 결과 미제공</p>}
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
                    {result.ocrResults.length > 0 ? result.ocrResults.map((ocr, ocrIndex) => (
                      <div key={ocrIndex} className={styles.subBlock}>
                        <p className={styles.subTitle}>OCR 분석 {ocrIndex + 1}<Verdict positive={ocr.isDrug} /></p>
                        <Score label="OCR 마약 확률" value={ocr.score} />
                        <OcrText text={ocr.text} />
                        <p className={styles.itemMeta}>매칭 용어: {ocr.matchedTerms.join(", ") || "없음"}</p>
                        <p className={styles.itemMeta}>매칭 의도: {ocr.matchedIntents.join(", ") || "없음"}</p>
                      </div>
                    )) : result.ocrText.trim() ? <OcrText text={result.ocrText} /> : <p className={styles.subEmpty}>OCR 결과가 없습니다.</p>}
                  </div>
                </div>
              </li>
            ))}
            </ul>}
          </div>
        </section>
      )}

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
