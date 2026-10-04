"use client";

import { Check, Hash, Minus, Plus, Save, Timer, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DEFAULT_SETTINGS,
  INTERVAL_OPTIONS,
  MAX_CUSTOM_KEYWORDS,
  MAX_DETECTION_COUNT,
  MIN_DETECTION_COUNT,
  PRESET_KEYWORDS,
  loadDetectionSettings,
  saveDetectionSettings,
} from "@/lib/detection-settings";
import styles from "./settings.module.css";

export default function DetectionSettings() {
  const [enabledPresets, setEnabledPresets] = useState(DEFAULT_SETTINGS.enabledPresets);
  const [customKeywords, setCustomKeywords] = useState(DEFAULT_SETTINGS.customKeywords);
  const [intervalMinutes, setIntervalMinutes] = useState(DEFAULT_SETTINGS.intervalMinutes);
  const [countInput, setCountInput] = useState(String(DEFAULT_SETTINGS.detectionCount));
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [savedAt, setSavedAt] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // localStorage는 클라이언트에만 있으므로 마운트 후에 읽어 하이드레이션 불일치를 막는다.
  useEffect(() => {
    const stored = loadDetectionSettings();
    setEnabledPresets(stored.enabledPresets);
    setCustomKeywords(stored.customKeywords);
    setIntervalMinutes(stored.intervalMinutes);
    setCountInput(String(stored.detectionCount));
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  function togglePreset(word: string) {
    setEnabledPresets((current) =>
      current.includes(word) ? current.filter((item) => item !== word) : [...current, word],
    );
  }

  function addCustomKeyword(event: FormEvent) {
    event.preventDefault();
    const word = keywordInput.trim();
    if (!word) return;
    if (customKeywords.length >= MAX_CUSTOM_KEYWORDS) {
      setKeywordError(`커스텀 키워드는 최대 ${MAX_CUSTOM_KEYWORDS}개까지 추가할 수 있습니다.`);
      return;
    }
    if ((PRESET_KEYWORDS as readonly string[]).includes(word)) {
      setKeywordError("기본 제공 키워드에 이미 포함된 단어입니다.");
      return;
    }
    if (customKeywords.includes(word)) {
      setKeywordError("이미 추가한 키워드입니다.");
      return;
    }
    setCustomKeywords((current) => [...current, word]);
    setKeywordInput("");
    setKeywordError("");
  }

  function removeCustomKeyword(word: string) {
    setCustomKeywords((current) => current.filter((item) => item !== word));
    setKeywordError("");
  }

  function clampCount(value: number) {
    return Math.min(MAX_DETECTION_COUNT, Math.max(MIN_DETECTION_COUNT, Math.round(value)));
  }

  function stepCount(delta: number) {
    const current = Number(countInput);
    setCountInput(String(clampCount(Number.isFinite(current) ? current + delta : DEFAULT_SETTINGS.detectionCount)));
  }

  function normalizeCount() {
    const value = Number(countInput);
    setCountInput(String(Number.isFinite(value) && countInput.trim() !== "" ? clampCount(value) : DEFAULT_SETTINGS.detectionCount));
  }

  function handleSave() {
    const value = Number(countInput);
    const detectionCount = Number.isFinite(value) && countInput.trim() !== "" ? clampCount(value) : DEFAULT_SETTINGS.detectionCount;
    setCountInput(String(detectionCount));
    saveDetectionSettings({ enabledPresets, customKeywords, intervalMinutes, detectionCount });
    setSavedAt(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedAt(false), 2500);
  }

  const activeKeywordCount = enabledPresets.length + customKeywords.length;

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="keywords-title">
        <header className={styles.cardHeader}>
          <h2 id="keywords-title"><Hash aria-hidden="true" />탐지 키워드</h2>
          <small>사용 중 {activeKeywordCount}개</small>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.help}>탐지에 사용할 키워드를 선택하세요. 선택을 해제한 키워드는 탐지에서 제외됩니다.</p>
          <div className={styles.chipGrid} role="group" aria-label="기본 제공 키워드">
            {PRESET_KEYWORDS.map((word) => (
              <button
                key={word}
                type="button"
                className={styles.keywordChip}
                aria-pressed={enabledPresets.includes(word)}
                onClick={() => togglePreset(word)}
              >
                {word}
              </button>
            ))}
          </div>

          <div className={styles.customBlock}>
            <p className={styles.customLabel}>
              커스텀 키워드 <small>{customKeywords.length}/{MAX_CUSTOM_KEYWORDS}</small>
            </p>
            {customKeywords.length > 0 && (
              <div className={styles.chipGrid}>
                {customKeywords.map((word) => (
                  <span key={word} className={styles.customChip}>
                    {word}
                    <button type="button" onClick={() => removeCustomKeyword(word)} aria-label={`${word} 키워드 삭제`}>
                      <X aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form className={styles.addRow} onSubmit={addCustomKeyword}>
              <input
                type="text"
                value={keywordInput}
                onChange={(event) => {
                  setKeywordInput(event.target.value);
                  setKeywordError("");
                }}
                placeholder="추가할 키워드 입력"
                maxLength={20}
                disabled={customKeywords.length >= MAX_CUSTOM_KEYWORDS}
                aria-label="커스텀 키워드 입력"
                aria-invalid={Boolean(keywordError)}
                aria-describedby={keywordError ? "keyword-error" : undefined}
              />
              <button type="submit" disabled={customKeywords.length >= MAX_CUSTOM_KEYWORDS || !keywordInput.trim()}>
                <Plus aria-hidden="true" />추가
              </button>
            </form>
            {keywordError && <p id="keyword-error" className={styles.error} role="alert">{keywordError}</p>}
            {customKeywords.length >= MAX_CUSTOM_KEYWORDS && !keywordError && (
              <p className={styles.help}>커스텀 키워드를 모두 사용했습니다. 삭제 후 새 키워드를 추가할 수 있습니다.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="interval-title">
        <header className={styles.cardHeader}>
          <h2 id="interval-title"><Timer aria-hidden="true" />탐지 간격</h2>
          <small>{INTERVAL_OPTIONS.find((option) => option.minutes === intervalMinutes)?.label} 주기</small>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.help}>선택한 주기마다 대상 게시글을 수집하고 분석합니다.</p>
          <div className={styles.chipGrid} role="radiogroup" aria-label="탐지 간격 선택">
            {INTERVAL_OPTIONS.map((option) => (
              <button
                key={option.minutes}
                type="button"
                role="radio"
                className={styles.intervalChip}
                aria-checked={intervalMinutes === option.minutes}
                onClick={() => setIntervalMinutes(option.minutes)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="count-title">
        <header className={styles.cardHeader}>
          <h2 id="count-title"><Hash aria-hidden="true" />탐지 갯수</h2>
          <small>회당 최대 수집량</small>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.help}>
            1회 탐지에서 수집할 최대 게시글 수입니다. ({MIN_DETECTION_COUNT}~{MAX_DETECTION_COUNT}개)
          </p>
          <div className={styles.stepper}>
            <button type="button" onClick={() => stepCount(-5)} aria-label="탐지 갯수 5 줄이기"><Minus aria-hidden="true" /></button>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_DETECTION_COUNT}
              max={MAX_DETECTION_COUNT}
              value={countInput}
              onChange={(event) => setCountInput(event.target.value)}
              onBlur={normalizeCount}
              aria-label="탐지 갯수"
            />
            <button type="button" onClick={() => stepCount(5)} aria-label="탐지 갯수 5 늘리기"><Plus aria-hidden="true" /></button>
            <span>개 / 회</span>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        <p role="status" aria-live="polite" className={styles.savedNote}>
          {savedAt && <><Check aria-hidden="true" />설정이 저장되었습니다.</>}
        </p>
        <button type="button" className={styles.saveButton} onClick={handleSave}>
          <Save aria-hidden="true" />설정 저장
        </button>
      </div>
    </div>
  );
}
