"use client";

import { FileText, ImagePlus, ScanSearch, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { scoreColors, toPercent } from "@/lib/detections";
import { analyzeContent, type AnalyzeResult } from "@/lib/text-detector";
import viewerStyles from "./detections.module.css";
import styles from "./settings.module.css";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type PickedImage = { id: string; name: string; dataUrl: string; base64: string };
type ItemResult = {
  label: string;
  thumb?: string;
  outcome?: AnalyzeResult;
  /** 이미지에서 추출된 OCR 텍스트를 다시 텍스트 분석에 돌린 결과 */
  ocrOutcome?: AnalyzeResult;
  error?: string;
};

function readImage(file: File): Promise<PickedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl,
        // API는 data URL 접두사 없는 순수 base64를 받는다.
        base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
      });
    };
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export default function AnalyzeForm() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ItemResult[] | null>(null);
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
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    resetOutcome();

    const room = MAX_IMAGES - images.length;
    if (files.length > room) setError(`이미지는 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`);
    const picked: PickedImage[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 추가할 수 있습니다.");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError("이미지는 4MB 이하만 추가할 수 있습니다.");
        continue;
      }
      try {
        picked.push(await readImage(file));
      } catch {
        setError("이미지를 읽지 못했습니다. 다른 파일로 시도해 주세요.");
      }
    }
    if (picked.length > 0) setImages((current) => [...current, ...picked]);
  }

  function removeImage(id: string) {
    setImages((current) => current.filter((image) => image.id !== id));
    resetOutcome();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    resetOutcome();

    // 입력별 스코어를 따로 보여주기 위해 텍스트와 각 이미지를 단독으로 분석한다.
    const tasks: { label: string; thumb?: string; payload: { text?: string; image?: string } }[] = [];
    if (text.trim()) tasks.push({ label: "텍스트", payload: { text } });
    images.forEach((image, index) => {
      tasks.push({ label: `이미지 ${index + 1} · ${image.name}`, thumb: image.dataUrl, payload: { image: image.base64 } });
    });
    if (tasks.length === 0) {
      setError("분석할 텍스트를 입력하거나 이미지를 추가해 주세요.");
      return;
    }

    inFlight.current = true;
    setPending(true);
    const collected: ItemResult[] = [];
    try {
      // 서버 부하와 요청 제한을 고려해 항목별로 순차 분석한다.
      for (let index = 0; index < tasks.length; index += 1) {
        setProgress(`${index + 1}/${tasks.length} 분석 중입니다. 잠시만 기다려 주세요…`);
        const task = tasks[index];
        try {
          const outcome = await analyzeContent(task.payload);
          let ocrOutcome: AnalyzeResult | undefined;
          // 이미지에서 텍스트가 추출됐으면 그 텍스트가 얼마나 의심되는지도 따로 분석한다.
          if (task.payload.image && outcome.ocrText) {
            try {
              ocrOutcome = await analyzeContent({ text: outcome.ocrText });
            } catch {
              // OCR 텍스트 추가 분석 실패는 이미지 결과 표시를 막지 않는다.
            }
          }
          collected.push({ label: task.label, thumb: task.thumb, outcome, ocrOutcome });
        } catch (err) {
          collected.push({ label: task.label, thumb: task.thumb, error: err instanceof Error ? err.message : "분석에 실패했습니다." });
        }
      }
      setResults(collected);
      if (!collected.some((item) => item.outcome)) {
        setError("분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      inFlight.current = false;
      setPending(false);
      setProgress("");
    }
  }

  const analyzed = results?.filter((item) => item.outcome) ?? [];
  // 이미지 자체는 정상이어도 이미지 속 텍스트가 의심이면 전체 판정은 의심으로 본다.
  const anyDrug = analyzed.some((item) => item.outcome?.isDrug || item.ocrOutcome?.isDrug);
  const canSubmit = !pending && (Boolean(text.trim()) || images.length > 0);

  return (
    <div className={styles.page}>
      <form className={styles.formStack} onSubmit={handleSubmit}>
        <section className={styles.card} aria-labelledby="analyze-title">
          <header className={styles.cardHeader}>
            <h2 id="analyze-title"><ScanSearch aria-hidden="true" />단순 분석</h2>
            <small>텍스트 {text.length.toLocaleString("ko-KR")}자 · 이미지 {images.length}/{MAX_IMAGES}</small>
          </header>
          <div className={styles.cardBody}>
            <p className={styles.help}>게시글 텍스트나 이미지를 넣으면 마약 관련 의심 여부를 분석합니다. 텍스트와 각 이미지가 얼마나 의심되는지 스코어로 보여줍니다.</p>
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
                disabled={pending}
                className={styles.textarea}
              />
            </div>

            <div className={styles.field} style={{ marginTop: 16 }}>
              <label htmlFor="analyze-images">이미지 (선택, 최대 {MAX_IMAGES}장 · 장당 4MB)</label>
              <input
                ref={fileInput}
                id="analyze-images"
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFiles}
              />
              <div>
                <button
                  type="button"
                  className={styles.addImage}
                  onClick={() => fileInput.current?.click()}
                  disabled={pending || images.length >= MAX_IMAGES}
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
                        disabled={pending}
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
            {pending ? progress : error}
          </p>
          <button type="submit" className={styles.saveButton} disabled={!canSubmit}>
            <ScanSearch aria-hidden="true" />{pending ? "분석 중…" : "분석하기"}
          </button>
        </div>
      </form>

      {results !== null && analyzed.length > 0 && (
        <section className={styles.resultCard} data-tone={anyDrug ? "danger" : "safe"} aria-labelledby="overall-title">
          <div className={styles.resultHead}>
            <span className={styles.resultIcon} aria-hidden="true">
              {anyDrug ? <TriangleAlert /> : <ShieldCheck />}
            </span>
            <h2 id="overall-title" className={styles.resultTitle}>
              {anyDrug ? "마약 관련 의심 신호가 탐지되었습니다" : "마약 관련 의심 신호가 탐지되지 않았습니다"}
            </h2>
          </div>
          <ul className={styles.scoreList}>
              {results.map((item, index) => (
                <li key={`${item.label}-${index}`} className={styles.itemRow}>
                  {item.thumb ? (
                    <button
                      type="button"
                      className={styles.thumbZoom}
                      onClick={() => setViewerUrl(item.thumb ?? null)}
                      aria-label={`${item.label} 원본 크기로 보기`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={styles.itemThumb} src={item.thumb} alt="" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className={styles.itemIcon} aria-hidden="true"><FileText /></span>
                  )}
                  <div className={styles.itemBody}>
                    <p className={styles.itemTitle}>
                      {item.label}
                      {/* 이미지 행은 세부 블록(객체 탐지/OCR)에서 상태를 보여주므로 텍스트 행에만 배지를 단다. */}
                      {item.outcome && !item.thumb && (
                        <span className={styles.itemBadge} data-tone={item.outcome.isDrug ? "danger" : "safe"}>
                          {item.outcome.isDrug ? "의심" : "정상"}
                        </span>
                      )}
                      {item.error && <span className={styles.itemBadge} data-tone="error">실패</span>}
                    </p>
                    {item.error && <p className={styles.itemMeta}>{item.error}</p>}
                    {!item.thumb && item.outcome?.probDrug !== null && item.outcome?.probDrug !== undefined && (
                      <div className={styles.probRow}>
                        <span className={styles.probLabel}>마약 의심 비율</span>
                        <i className={styles.probTrack} aria-hidden="true">
                          <b
                            style={{
                              width: toPercent(item.outcome.probDrug),
                              background: scoreColors(item.outcome.probDrug, 0).stroke,
                            }}
                          />
                        </i>
                        <strong className={styles.probValue} style={{ color: scoreColors(item.outcome.probDrug, 0).fg }}>
                          {toPercent(item.outcome.probDrug)}
                        </strong>
                      </div>
                    )}
                    {item.outcome && item.thumb && (
                      <>
                        <div className={styles.subBlock}>
                          <p className={styles.subTitle}>
                            객체 탐지 결과
                            {item.outcome.detectedObjects.length > 0 ? (
                              <span className={styles.itemBadge} data-tone={item.outcome.isDrug ? "danger" : "safe"}>
                                {item.outcome.isDrug ? "의심" : "정상"}
                              </span>
                            ) : (
                              <span className={styles.itemBadge} data-tone="muted">미검출</span>
                            )}
                          </p>
                          {item.outcome.detectedObjects.length > 0 ? (
                            <ul className={styles.objectList}>
                              {[...item.outcome.detectedObjects]
                                .sort((a, b) => b.confidence - a.confidence)
                                .map((object, objectIndex) => (
                                  <li key={`${object.className}-${objectIndex}`} className={styles.objectRow}>
                                    <span className={styles.objectName} title={object.className}>{object.className}</span>
                                    <i className={styles.probTrack} aria-hidden="true">
                                      <b
                                        style={{
                                          width: toPercent(object.confidence),
                                          background: scoreColors(object.confidence, 0).stroke,
                                        }}
                                      />
                                    </i>
                                    <strong className={styles.probValue} style={{ color: scoreColors(object.confidence, 0).fg }}>
                                      {toPercent(object.confidence)}
                                    </strong>
                                  </li>
                                ))}
                            </ul>
                          ) : (
                            <p className={styles.subEmpty}>이미지에서 탐지된 객체가 없습니다.</p>
                          )}
                        </div>
                        <div className={styles.subBlock}>
                          <p className={styles.subTitle}>
                            이미지 속 텍스트 (OCR)
                            {item.outcome.ocrText ? (
                              item.ocrOutcome && (
                                <span className={styles.itemBadge} data-tone={item.ocrOutcome.isDrug ? "danger" : "safe"}>
                                  {item.ocrOutcome.isDrug ? "의심" : "정상"}
                                </span>
                              )
                            ) : (
                              <span className={styles.itemBadge} data-tone="muted">미검출</span>
                            )}
                          </p>
                          {item.outcome.ocrText ? (
                            <>
                              <p className={styles.ocrText}>{item.outcome.ocrText}</p>
                              {item.ocrOutcome?.probDrug !== null && item.ocrOutcome?.probDrug !== undefined && (
                                <div className={styles.probRow}>
                                  <span className={styles.probLabel}>마약 의심 비율</span>
                                  <i className={styles.probTrack} aria-hidden="true">
                                    <b
                                      style={{
                                        width: toPercent(item.ocrOutcome.probDrug),
                                        background: scoreColors(item.ocrOutcome.probDrug, 0).stroke,
                                      }}
                                    />
                                  </i>
                                  <strong
                                    className={styles.probValue}
                                    style={{ color: scoreColors(item.ocrOutcome.probDrug, 0).fg }}
                                  >
                                    {toPercent(item.ocrOutcome.probDrug)}
                                  </strong>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className={styles.subEmpty}>이미지에서 추출된 텍스트가 없습니다.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
          </ul>
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
