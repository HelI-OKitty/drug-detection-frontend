"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Clock,
  History,
  Loader2,
  Minus,
  Plus,
  Power,
  Radar,
  RefreshCw,
  Search,
  Timer,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { triggerCrawl, type CrawlResult } from "@/app/admin/crawl/actions";
import { toggleCrawlEnabled, type CrawlSettings } from "@/app/settings/detection/actions";
import type { CrawlRun } from "@/lib/detections-api";
import { intervalLabel } from "@/lib/detection-settings";
import styles from "./settings.module.css";

const MIN_RESULTS = 10;
const MAX_RESULTS = 100;
const DEFAULT_RESULTS = 10;

/** 이 브라우저에서 실행한 크롤링. 서버 수집 기록에 잡히기 전까지 상태 행으로 보여준다. */
type LocalRun = {
  /** 시작 시각 epoch ms — 행 식별자 겸 서버 기록과의 중복 제거 기준 */
  id: number;
  startedLabel: string;
  status: "running" | "done" | "failed";
  /** 요청한 최대 수집 건수 */
  requested: number;
  total?: number;
  saved?: number;
  skipped?: number;
  /** 실패 사유 — 돋보기 버튼으로 다이얼로그에 띄운다 */
  reason?: string;
};

/**
 * TODO(mock): 실행 단계(시작/이미지/텍스트)와 오류 사유는 백엔드가 아직 안 내려준다.
 * 상태별 UI 확인용 목업 행 — 실행 상태 API가 생기면 이 목록과 렌더링 분기를 실데이터로 교체한다.
 */
const SHOW_STATUS_MOCK = true;
type MockStatus = "start" | "image" | "text" | "ocr" | "done" | "error";
const MOCK_STATUS_LABEL: Record<MockStatus, string> = {
  start: "시작",
  image: "이미지 검출",
  text: "텍스트 분석",
  ocr: "OCR 텍스트",
  done: "완료",
  error: "오류",
};
/** 실행 단계 순서. 진행 중 상태면 이 인덱스까지 단계 바가 채워진다. */
const STAGE_ORDER: MockStatus[] = ["start", "image", "text", "ocr"];
const MOCK_RUNS: {
  key: string;
  status: MockStatus;
  time: string;
  requested: number | null;
  collected: number | null;
  positive: number | null;
  negative: number | null;
  note: string;
  keywords: string[];
  platforms: string;
  reason?: string;
}[] = [
  { key: "mock-start", status: "start", time: "2026-10-19 14:40", requested: 40, collected: null, positive: null, negative: null, note: "게시글 수집을 준비하고 있습니다", keywords: [], platforms: "—" },
  { key: "mock-image", status: "image", time: "2026-10-19 14:10", requested: 40, collected: 40, positive: null, negative: null, note: "이미지 분석 12/40 처리 중", keywords: [], platforms: "X (Twitter)" },
  { key: "mock-text", status: "text", time: "2026-10-19 13:55", requested: 40, collected: 40, positive: null, negative: null, note: "텍스트 분석 33/40 처리 중", keywords: [], platforms: "X (Twitter)" },
  { key: "mock-ocr", status: "ocr", time: "2026-10-19 13:40", requested: 40, collected: 40, positive: null, negative: null, note: "OCR 텍스트 분석 8/12 처리 중", keywords: [], platforms: "X (Twitter)" },
  {
    key: "mock-error",
    status: "error",
    time: "2026-10-19 13:10",
    requested: 40,
    collected: null,
    positive: null,
    negative: null,
    note: "수집이 중단되었습니다",
    keywords: [],
    platforms: "X (Twitter)",
    reason: "X API 요청 한도를 초과해 수집이 중단되었습니다 (HTTP 429). 다음 주기에 자동으로 다시 시도합니다.",
  },
  { key: "mock-done", status: "done", time: "2026-10-19 12:40", requested: 40, collected: 17, positive: 5, negative: 12, note: "", keywords: ["브액", "아이스"], platforms: "X (Twitter)" },
];

/** KST "YYYY-MM-DD HH:mm" — 서버 수집 기록의 시각 표기와 맞춘다. */
function timeLabel(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** 남은 시간을 "1시간 5분" / "4분 30초" / "12초" 형태로 표기 */
function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${String(seconds).padStart(2, "0")}초`;
  return `${seconds}초`;
}

export default function CrawlConsole({
  adminName,
  settings: initialSettings,
  runs,
  runsLoaded,
}: {
  adminName: string;
  settings: CrawlSettings | null;
  runs: CrawlRun[];
  runsLoaded: boolean;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [toggling, setToggling] = useState(false);
  const [countInput, setCountInput] = useState(String(DEFAULT_RESULTS));
  const [pending, setPending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [finishedAt, setFinishedAt] = useState("");
  const [error, setError] = useState("");
  const [localRuns, setLocalRuns] = useState<LocalRun[]>([]);
  // 돋보기로 연 실행 사유 팝오버 (버튼 옆에 뜨는 작은 알림창)
  const [reasonPopover, setReasonPopover] = useState<{ time: string; reason: string; x: number; y: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [refreshing, startRefresh] = useTransition();
  // 자동 크롤링을 이 화면에서 켠 시각. 수집 기록보다 최근이면 카운트다운 기준점으로 쓴다.
  const [enabledAtMs, setEnabledAtMs] = useState<number | null>(null);
  // 1초마다 갱신되는 현재 시각. SSR 불일치를 피하려고 mount 후에만 채운다.
  const [nowMs, setNowMs] = useState<number | null>(null);
  const inFlight = useRef(false);

  // 뒤로가기로 돌아오면 Next 라우터 캐시가 이전 서버 데이터(설정·수집 기록)를 그대로 복원하므로
  // 화면이 다시 마운트될 때 한 번 갱신한다.
  useEffect(() => {
    router.refresh();
  }, [router]);

  // 실행 중 경과 시간 표시
  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  // 다음 자동 실행 카운트다운용 시계
  useEffect(() => {
    if (!settings?.crawlEnabled) {
      setNowMs(null);
      return;
    }
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [settings?.crawlEnabled]);

  // 사유 팝오버 닫기: Esc · 바깥 클릭 · 스크롤/리사이즈
  useEffect(() => {
    if (!reasonPopover) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReasonPopover(null);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (popoverRef.current && event.target instanceof Node && popoverRef.current.contains(event.target)) return;
      setReasonPopover(null);
    };
    const onClose = () => setReasonPopover(null);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [reasonPopover]);

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

  async function handleToggle() {
    if (toggling || !settings) return;
    const next = !settings.crawlEnabled;
    setError("");
    setToggling(true);
    const response = await toggleCrawlEnabled(next);
    if (response.success) {
      setSettings(response.settings);
      // 켜는 순간을 기준점으로 삼아 다음 실행까지 남은 시간을 추정한다.
      setEnabledAtMs(response.settings.crawlEnabled ? Date.now() : null);
    } else {
      setError(response.message);
    }
    setToggling(false);
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
    const startedAt = Date.now();
    setLocalRuns((current) => [
      { id: startedAt, startedLabel: timeLabel(new Date(startedAt)), status: "running", requested: max },
      ...current,
    ]);
    try {
      const response = await triggerCrawl(max);
      if (response.success) {
        setResult(response.result);
        setFinishedAt(new Date().toLocaleTimeString("ko-KR"));
        setLocalRuns((current) =>
          current.map((run) => (run.id === startedAt ? { ...run, status: "done" as const, ...response.result } : run)),
        );
        // 서버 수집 기록에도 이번 실행이 반영되도록 갱신한다.
        startRefresh(() => router.refresh());
      } else {
        setError(response.message);
        setLocalRuns((current) =>
          current.map((run) =>
            run.id === startedAt ? { ...run, status: "failed" as const, reason: response.message } : run,
          ),
        );
      }
    } catch {
      const message = "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      setError(message);
      setLocalRuns((current) =>
        current.map((run) => (run.id === startedAt ? { ...run, status: "failed" as const, reason: message } : run)),
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function handleHistoryRefresh() {
    if (refreshing) return;
    startRefresh(() => router.refresh());
  }

  const crawlEnabled = settings?.crawlEnabled ?? false;

  // 다음 자동 실행 추정: 마지막 수집 시각(없으면 이 화면에서 켠 시각) + 주기.
  // 백엔드가 다음 실행 시각을 내려주지 않아 휴리스틱으로 계산한다.
  const latestRunMs = runs.length > 0 ? runs[0].finishedAtMs : null;
  const anchorMs = Math.max(latestRunMs ?? 0, enabledAtMs ?? 0) || null;
  const anchorIsRun = anchorMs !== null && anchorMs === latestRunMs;
  const nextRunLabel = (() => {
    if (!crawlEnabled || !settings) return null;
    if (anchorMs === null) return "아직 수집 기록이 없어 다음 실행 시각을 추정할 수 없습니다. 첫 실행 이후 표시됩니다.";
    if (nowMs === null) return "다음 실행 시각을 계산하고 있습니다…";
    // 기준 시각이 주기보다 오래됐으면 다음 주기 경계까지 남은 시간으로 환산해 항상 카운트다운을 보여준다.
    const intervalMs = settings.scheduleInterval * 60_000;
    const sinceAnchor = Math.max(0, nowMs - anchorMs);
    const remaining = intervalMs - (sinceAnchor % intervalMs);
    return `다음 자동 크롤링 시작까지 약 ${formatRemaining(remaining)} 남았습니다. (${anchorIsRun ? "마지막 수집 시각" : "자동 크롤링을 켠 시각"} 기준 추정)`;
  })();

  // 저장까지 끝난 실행은 새로고침 후 서버 수집 기록 쪽에 나타나므로, 중복되는 로컬 행은 숨긴다.
  // (저장 0건·실패 실행은 서버 기록에 남지 않아 로컬 행으로 계속 보여준다.)
  const visibleLocalRuns = localRuns.filter(
    (run) => run.status !== "done" || (run.saved ?? 0) === 0 || (latestRunMs ?? 0) < run.id,
  );
  const hasRows = SHOW_STATUS_MOCK || visibleLocalRuns.length > 0 || runs.length > 0;

  /** 사유가 있는 행에 붙는 돋보기 버튼 — 버튼 옆에 작은 팝오버로 사유를 띄운다 */
  function reasonButton(time: string, reason: string | undefined) {
    if (!reason) return null;
    return (
      <button
        type="button"
        className={styles.reasonButton}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          // 화면 오른쪽을 벗어나지 않게 x를 당긴다 (팝오버 폭 300px + 여백).
          // 마우스에 가리지 않도록 버튼 위쪽으로 띄운다 (CSS에서 translateY(-100%)).
          const x = Math.min(rect.left, window.innerWidth - 316);
          setReasonPopover((current) =>
            current?.time === time ? null : { time, reason, x: Math.max(8, x), y: rect.top - 6 },
          );
        }}
        aria-haspopup="dialog"
        aria-label="사유 보기"
      >
        <Search aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={styles.page}>
      {error && (
        <div className={styles.alertBanner} role="alert">
          <TriangleAlert aria-hidden="true" />
          <p>{error}</p>
          <button type="button" onClick={() => setError("")} aria-label="오류 알림 닫기">
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <section className={styles.group} aria-label="자동 크롤링 모니터링">
        <p className={styles.groupLabel}>자동 크롤링 모니터링</p>

        <section className={styles.card} aria-labelledby="auto-crawl-title">
          <header className={styles.cardHeader}>
            <h2 id="auto-crawl-title"><Power aria-hidden="true" />자동 크롤링</h2>
            <small>
              {settings
                ? crawlEnabled
                  ? `ON · ${intervalLabel(settings.scheduleInterval)} 주기`
                  : "OFF"
                : "설정을 불러오지 못함"}
            </small>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.switchRow}>
              <div>
                <p className={styles.switchLabel}>자동 크롤링 사용</p>
                <p className={styles.help}>
                  켜면 설정한 주기마다 자동으로 게시글 수집과 AI 분석이 실행됩니다. 변경 즉시 서버에 반영됩니다.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={crawlEnabled}
                aria-label="자동 크롤링 사용"
                className={styles.switch}
                onClick={handleToggle}
                disabled={toggling || !settings}
              />
            </div>
            {nextRunLabel && (
              <div className={styles.nextRunNote} role="status">
                <Timer aria-hidden="true" />
                {nextRunLabel}
              </div>
            )}
            <p className={styles.help} style={{ marginBottom: 0 }}>
              {settings
                ? <>키워드 {settings.keywords.length}개 · 회당 최대 {settings.maxResults}건 수집. 주기·키워드는 <Link href="/settings/detection" className={styles.inlineLink}>탐지 설정</Link>에서 바꿀 수 있습니다.</>
                : "서버에서 설정을 불러오지 못해 토글을 사용할 수 없습니다. 새로고침 후 다시 시도해 주세요."}
            </p>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="history-title">
          <header className={styles.cardHeader}>
            <h2 id="history-title"><History aria-hidden="true" />수집 기록</h2>
            <small>최근 {runs.length}회</small>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.helpRow}>
              <p className={styles.help}>
                저장된 탐지의 수집 시각을 기준으로 실행 회차를 묶은 기록입니다. 중복으로 건너뛴 게시글은 포함되지 않습니다.
                실행 단계는 시작 → 이미지 검출 → 텍스트 분석 → OCR 텍스트 순으로 진행된 뒤 완료됩니다.
              </p>
              <div className={styles.bulkButtons}>
                <button type="button" onClick={handleHistoryRefresh} disabled={refreshing}>
                  <RefreshCw aria-hidden="true" className={refreshing ? styles.spin : undefined} />
                  {refreshing ? "갱신 중…" : "새로고침"}
                </button>
              </div>
            </div>
            {!runsLoaded && (
              <p className={styles.error} role="alert">서버 수집 기록을 불러오지 못했습니다. 새로고침으로 다시 시도해 주세요.</p>
            )}
            {!hasRows ? (
              <p className={styles.historyEmpty}>아직 수집 기록이 없습니다. 크롤링이 실행되면 회차별 기록이 여기에 쌓입니다.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.historyTable} aria-live="polite">
                  <thead>
                    <tr>
                      <th scope="col">상태</th>
                      <th scope="col">수집 시각</th>
                      <th scope="col">요청</th>
                      <th scope="col">수집</th>
                      <th scope="col">양성</th>
                      <th scope="col">음성</th>
                      <th scope="col">주요 키워드</th>
                      <th scope="col">플랫폼</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHOW_STATUS_MOCK && MOCK_RUNS.map((run) => {
                      const stageIndex = STAGE_ORDER.indexOf(run.status);
                      return (
                      <tr key={run.key} data-running={stageIndex >= 0 || undefined}>
                        <td className={styles.statusCell}>
                          <span className={styles.statusText} data-tone={run.status}>
                            {MOCK_STATUS_LABEL[run.status]}
                            {stageIndex >= 0 && <Loader2 className={styles.statusSpinner} aria-hidden="true" />}
                          </span>
                          {reasonButton(run.time, run.reason)}
                          {stageIndex >= 0 && (
                            <span
                              className={styles.stageDots}
                              title={`실행 단계 ${stageIndex + 1}/${STAGE_ORDER.length} · ${MOCK_STATUS_LABEL[run.status]}`}
                              aria-label={`실행 단계 ${stageIndex + 1}/${STAGE_ORDER.length}`}
                            >
                              {STAGE_ORDER.map((stage, index) => (
                                <i
                                  key={stage}
                                  data-state={index < stageIndex ? "done" : index === stageIndex ? "current" : undefined}
                                />
                              ))}
                            </span>
                          )}
                        </td>
                        <td className={styles.runTime}>{run.time}</td>
                        <td>{run.requested !== null ? run.requested : "—"}</td>
                        <td>{run.collected !== null ? <span className={styles.runCount}>{run.collected}</span> : "—"}</td>
                        <td>{run.positive !== null ? <span className={styles.runCount} data-tone="danger">{run.positive}</span> : "—"}</td>
                        <td>{run.negative !== null ? run.negative : "—"}</td>
                        <td className={run.keywords.length > 0 ? undefined : styles.runNote}>
                          {run.keywords.length > 0 ? (
                            <span className={styles.runTags}>
                              {run.keywords.map((word) => <span key={word} className={styles.runTag}>{word}</span>)}
                            </span>
                          ) : run.note}
                        </td>
                        <td>{run.platforms}</td>
                      </tr>
                      );
                    })}
                    {visibleLocalRuns.map((run) => (
                      <tr key={run.id} data-running={run.status === "running" || undefined}>
                        <td className={styles.statusCell}>
                          <span
                            className={styles.statusText}
                            data-tone={run.status === "running" ? "running" : run.status === "done" ? "done" : "error"}
                          >
                            {run.status === "running" ? "진행 중" : run.status === "done" ? "완료" : "오류"}
                            {run.status === "running" && <Loader2 className={styles.statusSpinner} aria-hidden="true" />}
                          </span>
                          {reasonButton(run.startedLabel, run.reason)}
                        </td>
                        <td className={styles.runTime}>{run.startedLabel}</td>
                        <td>{run.requested}</td>
                        <td>{run.status === "done" ? <span className={styles.runCount}>{run.saved}</span> : "—"}</td>
                        <td>—</td>
                        <td>—</td>
                        <td className={styles.runNote}>
                          {run.status === "running" && `${elapsed}초 경과 — 수 분이 걸릴 수 있습니다`}
                          {run.status === "done" && `전체 수집 ${run.total} · 중복 ${run.skipped} (상세는 새로고침 후 반영)`}
                          {run.status === "failed" && "실행에 실패했습니다"}
                        </td>
                        <td>—</td>
                      </tr>
                    ))}
                    {runs.map((run) => (
                      <tr key={run.finishedAt}>
                        <td className={styles.statusCell}>
                          <span className={styles.statusText} data-tone="done">완료</span>
                        </td>
                        <td className={styles.runTime}>{run.finishedAt}</td>
                        <td>—</td>
                        <td><span className={styles.runCount}>{run.count}</span></td>
                        <td><span className={styles.runCount} data-tone="danger">{run.positive}</span></td>
                        <td>{run.negative}</td>
                        <td>
                          {run.keywords.length > 0 ? (
                            <span className={styles.runTags}>
                              {run.keywords.map((word) => <span key={word} className={styles.runTag}>{word}</span>)}
                            </span>
                          ) : "-"}
                        </td>
                        <td>{run.platforms.length > 0 ? run.platforms.join(", ") : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </section>

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
            <Clock aria-hidden="true" />
            {settings
              ? crawlEnabled
                ? `자동 크롤링이 ${intervalLabel(settings.scheduleInterval)}마다 실행되고 있습니다. 아래 버튼은 즉시 1회 추가 실행합니다.`
                : "자동 크롤링이 꺼져 있습니다. 위에서 켜거나, 아래 버튼으로 즉시 1회 실행할 수 있습니다."
              : "아래 버튼은 즉시 1회 크롤링을 실행합니다."}
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
          <div className={styles.runRow}>
            <p role="status" aria-live="polite" className={styles.savedNote}>
              {pending && "크롤링을 실행하고 있습니다. 수 분이 걸릴 수 있으니 창을 닫지 말아 주세요…"}
            </p>
            <button type="button" className={styles.saveButton} onClick={handleRun} disabled={pending}>
              <Radar aria-hidden="true" />{pending ? "실행 중…" : "크롤링 실행"}
            </button>
          </div>
        </div>
      </section>

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

      {reasonPopover && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="실행 사유"
          className={styles.reasonPopover}
          style={{ left: reasonPopover.x, top: reasonPopover.y }}
        >
          <p className={styles.reasonPopoverTime}>{reasonPopover.time} 실행</p>
          <p className={styles.reasonPopoverBody}>{reasonPopover.reason}</p>
        </div>
      )}
    </div>
  );
}
