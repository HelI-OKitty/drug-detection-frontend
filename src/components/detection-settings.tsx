"use client";

import { Check, Hash, Minus, Plus, Power, Save, Timer, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import {
  INTERVAL_OPTIONS,
  MAX_CUSTOM_KEYWORDS,
  MAX_DETECTION_COUNT,
  MIN_DETECTION_COUNT,
  PRESET_KEYWORDS,
  intervalLabel,
} from "@/lib/detection-settings";
import {
  toggleCrawlEnabled,
  updateCrawlSettings,
  type CrawlSettings,
} from "@/app/settings/detection/actions";
import styles from "./settings.module.css";

const DEFAULT_COUNT = 100;
const DEFAULT_INTERVAL = 60;
const PRESETS: readonly string[] = PRESET_KEYWORDS;

export default function DetectionSettings({ initial }: { initial: CrawlSettings | null }) {
  const [enabledPresets, setEnabledPresets] = useState<string[]>(
    initial ? PRESETS.filter((word) => initial.keywords.includes(word)) : [...PRESETS],
  );
  const [customKeywords, setCustomKeywords] = useState<string[]>(
    initial ? initial.keywords.filter((word) => !PRESETS.includes(word)) : [],
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    initial && INTERVAL_OPTIONS.some((option) => option.minutes === initial.scheduleInterval)
      ? initial.scheduleInterval
      : DEFAULT_INTERVAL,
  );
  const [countInput, setCountInput] = useState(String(initial?.maxResults ?? DEFAULT_COUNT));
  const [crawlEnabled, setCrawlEnabled] = useState(initial?.crawlEnabled ?? false);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [error, setError] = useState(
    initial ? "" : "서버에서 설정을 불러오지 못해 기본값을 표시합니다. 저장하면 다시 연결을 시도합니다.",
  );
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(null);

  /** 서버가 돌려준 설정으로 화면 상태를 맞춘다. */
  function syncFrom(settings: CrawlSettings) {
    setEnabledPresets(PRESETS.filter((word) => settings.keywords.includes(word)));
    setCustomKeywords(settings.keywords.filter((word) => !PRESETS.includes(word)));
    if (INTERVAL_OPTIONS.some((option) => option.minutes === settings.scheduleInterval)) {
      setIntervalMinutes(settings.scheduleInterval);
    }
    setCountInput(String(settings.maxResults));
    setCrawlEnabled(settings.crawlEnabled);
  }

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
    if (PRESETS.includes(word)) {
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
    setCountInput(String(clampCount(Number.isFinite(current) ? current + delta : DEFAULT_COUNT)));
  }

  function normalizeCount() {
    const value = Number(countInput);
    setCountInput(String(Number.isFinite(value) && countInput.trim() !== "" ? clampCount(value) : DEFAULT_COUNT));
  }

  async function handleToggle() {
    if (toggling) return;
    setError("");
    setToggling(true);
    const result = await toggleCrawlEnabled(!crawlEnabled);
    if (result.success) {
      syncFrom(result.settings);
    } else {
      setError(result.message);
    }
    setToggling(false);
  }

  async function handleSave() {
    if (saving) return;
    const value = Number(countInput);
    const maxResults = Number.isFinite(value) && countInput.trim() !== "" ? clampCount(value) : DEFAULT_COUNT;
    setCountInput(String(maxResults));
    const keywords = [...enabledPresets, ...customKeywords];
    if (keywords.length === 0) {
      setError("크롤링에 사용할 키워드를 1개 이상 선택해 주세요.");
      return;
    }
    setError("");
    setSaving(true);
    const result = await updateCrawlSettings({ keywords, maxResults, scheduleInterval: intervalMinutes });
    if (result.success) {
      syncFrom(result.settings);
      setSavedAt(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedAt(false), 2500);
    } else {
      setError(result.message);
    }
    setSaving(false);
  }

  const activeKeywordCount = enabledPresets.length + customKeywords.length;

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="auto-crawl-title">
        <header className={styles.cardHeader}>
          <h2 id="auto-crawl-title"><Power aria-hidden="true" />자동 크롤링</h2>
          <small>{crawlEnabled ? `${intervalLabel(intervalMinutes)} 주기로 사용 중` : "꺼짐"}</small>
        </header>
        <div className={styles.cardBody}>
          <div className={styles.switchRow}>
            <div>
              <p className={styles.switchLabel}>자동 크롤링 사용</p>
              <p className={styles.help}>
                켜면 설정한 주기마다 자동으로 게시글 수집과 AI 분석이 실행됩니다. 이 스위치는 변경 즉시 서버에 반영됩니다.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={crawlEnabled}
              aria-label="자동 크롤링 사용"
              className={styles.switch}
              onClick={handleToggle}
              disabled={toggling}
            />
          </div>
        </div>
      </section>

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
          <small>{intervalLabel(intervalMinutes)} 주기</small>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.help}>자동 크롤링이 켜져 있으면 선택한 주기마다 대상 게시글을 수집하고 분석합니다.</p>
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
            <button type="button" onClick={() => stepCount(-10)} aria-label="탐지 갯수 10 줄이기"><Minus aria-hidden="true" /></button>
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
            <button type="button" onClick={() => stepCount(10)} aria-label="탐지 갯수 10 늘리기"><Plus aria-hidden="true" /></button>
            <span>개 / 회</span>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        <p role="status" aria-live="polite" className={error ? styles.error : styles.savedNote}>
          {error}
          {!error && savedAt && <><Check aria-hidden="true" />설정이 저장되었습니다.</>}
        </p>
        <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
          <Save aria-hidden="true" />{saving ? "저장 중…" : "설정 저장"}
        </button>
      </div>
    </div>
  );
}
