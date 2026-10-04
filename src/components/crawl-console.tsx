"use client";

import Link from "next/link";
import { CircleAlert, Clock, Minus, Plus, Radar } from "lucide-react";
import { useRef, useState } from "react";
import { triggerCrawl, type CrawlResult } from "@/app/admin/crawl/actions";
import styles from "./settings.module.css";

const MIN_RESULTS = 10;
const MAX_RESULTS = 100;
const DEFAULT_RESULTS = 100;

export default function CrawlConsole({ adminName }: { adminName: string }) {
  const [countInput, setCountInput] = useState(String(DEFAULT_RESULTS));
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [finishedAt, setFinishedAt] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  function clamp(value: number) {
    return Math.min(MAX_RESULTS, Math.max(MIN_RESULTS, Math.round(value)));
  }

  function stepCount(delta: number) {
    const current = Number(countInput);
    setCountInput(String(clamp(Number.isFinite(current) ? current + delta : DEFAULT_RESULTS)));
  }

  function normalizeCount() {
    const value = Number(countInput);
    setCountInput(String(Number.isFinite(value) && countInput.trim() !== "" ? clamp(value) : DEFAULT_RESULTS));
  }

  async function handleRun() {
    if (inFlight.current) return;
    const value = Number(countInput);
    const max = Number.isFinite(value) && countInput.trim() !== "" ? clamp(value) : DEFAULT_RESULTS;
    setCountInput(String(max));
    setError("");
    setResult(null);
    inFlight.current = true;
    setPending(true);
    try {
      const response = await triggerCrawl(max);
      if (response.success) {
        setResult(response.result);
        setFinishedAt(new Date().toLocaleTimeString("ko-KR"));
      } else {
        setError(response.message);
      }
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="crawl-title">
        <header className={styles.cardHeader}>
          <h2 id="crawl-title"><Radar aria-hidden="true" />수동 크롤링 실행</h2>
          <small>실행 관리자 {adminName}</small>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.help}>
            대상 플랫폼에서 게시글을 수집하고 AI 분석까지 실행합니다. 수집된 결과는 탐지 게시글 목록에 저장됩니다.
          </p>
          <div className={styles.scheduleNote}>
            <Clock aria-hidden="true" />자동 크롤링이 1시간마다 실행되고 있습니다. 아래 버튼은 즉시 1회 추가 실행합니다.
          </div>
          <div className={styles.field}>
            <label htmlFor="crawl-max">최대 수집 건수 ({MIN_RESULTS}~{MAX_RESULTS})</label>
            <div className={styles.stepper}>
              <button type="button" onClick={() => stepCount(-10)} disabled={pending} aria-label="수집 건수 10 줄이기"><Minus aria-hidden="true" /></button>
              <input
                id="crawl-max"
                type="number"
                inputMode="numeric"
                min={MIN_RESULTS}
                max={MAX_RESULTS}
                value={countInput}
                onChange={(event) => setCountInput(event.target.value)}
                onBlur={normalizeCount}
                disabled={pending}
              />
              <button type="button" onClick={() => stepCount(10)} disabled={pending} aria-label="수집 건수 10 늘리기"><Plus aria-hidden="true" /></button>
              <span>건 / 회</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        <p role="status" aria-live="polite" className={error ? styles.error : styles.savedNote}>
          {pending && "크롤링을 실행하고 있습니다. 수 분이 걸릴 수 있으니 창을 닫지 말아 주세요…"}
          {error}
        </p>
        <button type="button" className={styles.saveButton} onClick={handleRun} disabled={pending}>
          <Radar aria-hidden="true" />{pending ? "실행 중…" : "크롤링 실행"}
        </button>
      </div>

      {result && (
        <section className={styles.card} aria-labelledby="result-title">
          <header className={styles.cardHeader}>
            <h2 id="result-title"><CircleAlert aria-hidden="true" />실행 결과</h2>
            <small>{finishedAt} 완료</small>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.statGrid}>
              <div className={styles.stat}><strong>{result.total}</strong><span>수집된 게시글</span></div>
              <div className={styles.stat} data-tone="green"><strong>{result.saved}</strong><span>새로 저장된 탐지</span></div>
              <div className={styles.stat} data-tone="muted"><strong>{result.skipped}</strong><span>중복 건너뜀</span></div>
            </div>
            <p className={styles.help}>
              새로 저장된 탐지 게시글은 <Link href="/detections" className={styles.inlineLink}>탐지 게시글 목록</Link>에서 확인할 수 있습니다.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
