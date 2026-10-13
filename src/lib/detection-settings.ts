/** 탐지(크롤링) 설정 화면 상수. 값 저장은 백엔드 /crawl-settings 연동(app/settings/detection/actions.ts). */

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

/** 백엔드 키워드 상한 13개 = 기본 키워드 11개 + 커스텀 2개 */
export const MAX_CUSTOM_KEYWORDS = 2;
export const MIN_DETECTION_COUNT = 10;
export const MAX_DETECTION_COUNT = 100;

/** 백엔드가 허용하는 크롤링 주기(분): 10/60/120/180 */
export const INTERVAL_OPTIONS = [
  { minutes: 10, label: "10분" },
  { minutes: 60, label: "60분" },
  { minutes: 120, label: "120분" },
  { minutes: 180, label: "180분" },
] as const;

/** 주기(분)를 "60분" 형태의 라벨로 바꾼다. */
export function intervalLabel(minutes: number) {
  return `${minutes}분`;
}
