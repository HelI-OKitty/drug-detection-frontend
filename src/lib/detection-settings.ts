/** 탐지 설정 값과 로컬 저장 헬퍼. 백엔드 연동 전까지 localStorage에 보관한다. */

export const PRESET_KEYWORDS = [
  "브액",
  "작대기",
  "아이스",
  "오방",
  "시원한술",
  "빙두",
  "엑스터시",
  "대마",
  "필로폰",
  "코카인",
  "술친",
] as const;

export const MAX_CUSTOM_KEYWORDS = 2;
export const MIN_DETECTION_COUNT = 1;
export const MAX_DETECTION_COUNT = 100;

export const INTERVAL_OPTIONS = [
  { minutes: 10, label: "10분" },
  { minutes: 30, label: "30분" },
  { minutes: 60, label: "1시간" },
  { minutes: 180, label: "3시간" },
  { minutes: 360, label: "6시간" },
  { minutes: 720, label: "12시간" },
  { minutes: 1440, label: "24시간" },
] as const;

export interface DetectionSettings {
  /** 탐지에 사용할 기본 제공 키워드 */
  enabledPresets: string[];
  /** 사용자가 추가한 커스텀 키워드 (최대 MAX_CUSTOM_KEYWORDS개) */
  customKeywords: string[];
  /** 탐지(크롤링) 주기, 분 단위 */
  intervalMinutes: number;
  /** 1회 탐지당 수집할 최대 게시글 수 */
  detectionCount: number;
}

export const DEFAULT_SETTINGS: DetectionSettings = {
  enabledPresets: [...PRESET_KEYWORDS],
  customKeywords: [],
  intervalMinutes: 60,
  detectionCount: 20,
};

const STORAGE_KEY = "sentinel.detection-settings";

function clampCount(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.detectionCount;
  return Math.min(MAX_DETECTION_COUNT, Math.max(MIN_DETECTION_COUNT, Math.round(value)));
}

/** 저장된 설정을 읽는다. 없거나 깨져 있으면 기본값으로 돌아간다. */
export function loadDetectionSettings(): DetectionSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DetectionSettings>;
    const presets = Array.isArray(parsed.enabledPresets)
      ? PRESET_KEYWORDS.filter((word) => parsed.enabledPresets?.includes(word))
      : DEFAULT_SETTINGS.enabledPresets;
    const custom = Array.isArray(parsed.customKeywords)
      ? parsed.customKeywords.filter((word) => typeof word === "string" && word.trim()).slice(0, MAX_CUSTOM_KEYWORDS)
      : [];
    const interval = INTERVAL_OPTIONS.some((option) => option.minutes === parsed.intervalMinutes)
      ? (parsed.intervalMinutes as number)
      : DEFAULT_SETTINGS.intervalMinutes;
    return {
      enabledPresets: presets,
      customKeywords: custom,
      intervalMinutes: interval,
      detectionCount: clampCount(Number(parsed.detectionCount)),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDetectionSettings(settings: DetectionSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
