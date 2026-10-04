// 화면 구성을 위한 예시 데이터입니다. 실제 운영 데이터가 아니며,
// 백엔드 /detections 연동 시 이 모듈을 교체합니다.

export type ReviewStatus = "new" | "review" | "confirmed" | "excluded";

export type DetectionImage = { flagScore?: number };

export type Detection = {
  id: string;
  score: number;
  /** 목록에 보여줄 한 줄 요약 */
  summary: string;
  /** 상세에 보여줄 본문 전문 */
  content: string;
  nickname: string;
  platform: string;
  sourceUrl: string;
  postedAt: string;
  detectedAt: string;
  status: ReviewStatus;
  keywords: string[];
  images: DetectionImage[];
};

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  new: "NEW",
  review: "REVIEW",
  confirmed: "확정",
  excluded: "제외",
};

export const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "new", label: "미확인" },
  { key: "review", label: "검토중" },
  { key: "confirmed", label: "확정" },
  { key: "excluded", label: "제외" },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

export type RiskBand = "high" | "mid" | "low";

export function riskBand(score: number): RiskBand {
  if (score >= 0.85) return "high";
  if (score >= 0.8) return "mid";
  return "low";
}

export const RISK_LABEL: Record<RiskBand, string> = {
  high: "HIGH RISK",
  mid: "MEDIUM RISK",
  low: "LOW RISK",
};

/** source_url에서 표시용 호스트만 뽑는다. 잘못된 URL이면 원본을 그대로 돌려준다. */
export function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 상세 메타데이터에 보여줄 축약 URL. x.com/…/0712 형태. */
export function shortUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    const last = pathname.split("/").filter(Boolean).pop();
    return last ? `${hostname.replace(/^www\./, "")}/…/${last}` : hostname;
  } catch {
    return url;
  }
}

export const detections: Detection[] = [
  {
    id: "det_abc91f",
    score: 0.92,
    summary: "급처 아이스 텔레 @xxxx 디엠 ㄱㄱ 직접 만나서 던지기도 가능",
    content:
      "급처 아이스 텔레 @xxxx 디엠 ㄱㄱ 직접 만나서 던지기도 가능합니다. 초보환영 후기 많음. 작대기 같이 문의 받아요. 가격 디엠으로.",
    nickname: "@gh0st_supply_07",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/gh0st_supply_07/status/0712",
    postedAt: "2026-05-29 02:14",
    detectedAt: "2026-05-29 02:17",
    status: "new",
    keywords: ["아이스", "던지기", "작대기", "급처", "텔레"],
    images: [{ flagScore: 0.94 }, {}, {}],
  },
  {
    id: "det_5f20ac",
    score: 0.88,
    summary: "작대기 구해요 서울 강남 직거래 후기 보고 연락주세요 시그널",
    content:
      "작대기 구해요 서울 강남 직거래 후기 보고 연락주세요. 시그널로 연락 주시면 빠르게 답변드립니다. 잠수 없는 분만.",
    nickname: "@blue_signal_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/blue_signal_/status/0689",
    postedAt: "2026-05-29 01:44",
    detectedAt: "2026-05-29 01:50",
    status: "new",
    keywords: ["작대기", "직거래", "시그널"],
    images: [{ flagScore: 0.81 }, {}],
  },
  {
    id: "det_77c3d8",
    score: 0.85,
    summary: "고급 떨 입고 완료 ✈️ 텔레그램 채널 보고 문의 디엠환영",
    content:
      "고급 떨 입고 완료 ✈️ 텔레그램 채널 보고 문의 주세요. 디엠환영. 후기 채널 따로 운영합니다.",
    nickname: "@sky_delivery22",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/sky_delivery22/status/0651",
    postedAt: "2026-05-28 23:24",
    detectedAt: "2026-05-28 23:31",
    status: "review",
    keywords: ["떨", "텔레그램", "디엠"],
    images: [{}, {}, {}, {}],
  },
  {
    id: "det_1a9e42",
    score: 0.81,
    summary: "빙두 케이 문의 받습니다 안전배송 잠수 없음 단골 우대",
    content: "빙두 케이 문의 받습니다. 안전배송 잠수 없음. 단골 우대해드립니다. 텔레 아이디 프로필 참고.",
    nickname: "@k_trust_dist",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/k_trust_dist/status/0633",
    postedAt: "2026-05-28 22:01",
    detectedAt: "2026-05-28 22:08",
    status: "new",
    keywords: ["빙두", "케이", "안전배송"],
    images: [],
  },
  {
    id: "det_3b0c57",
    score: 0.79,
    summary: "신상 입고 디엠 ㄱ 직거래 던지기 둘다 됨 강남 일대",
    content: "신상 입고 디엠 ㄱ. 직거래 던지기 둘다 됩니다. 강남 일대 위주로 움직여요.",
    nickname: "@neo_drop_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/neo_drop_/status/0611",
    postedAt: "2026-05-28 20:37",
    detectedAt: "2026-05-28 20:44",
    status: "confirmed",
    keywords: ["신상", "던지기", "직거래"],
    images: [{ flagScore: 0.88 }],
  },
  {
    id: "det_9d4412",
    score: 0.76,
    summary: "믿을 수 있는 곳 찾으시면 텔레 @ 추가 후기많음 빠른응답",
    content: "믿을 수 있는 곳 찾으시면 텔레 @ 추가해주세요. 후기많음 빠른응답 약속드립니다.",
    nickname: "@fast_reply_x",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/fast_reply_x/status/0588",
    postedAt: "2026-05-28 19:05",
    detectedAt: "2026-05-28 19:12",
    status: "excluded",
    keywords: ["텔레", "후기"],
    images: [],
  },
  {
    id: "det_c81b06",
    score: 0.9,
    summary: "아이스 시원한거 준비됨 텔레 문의 선입금 없이 진행",
    content: "아이스 시원한거 준비됨. 텔레 문의 주세요. 선입금 없이 진행합니다.",
    nickname: "@cold_line_9",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/cold_line_9/status/0570",
    postedAt: "2026-05-28 18:22",
    detectedAt: "2026-05-28 18:29",
    status: "new",
    keywords: ["아이스", "텔레", "선입금"],
    images: [{ flagScore: 0.91 }, {}],
  },
  {
    id: "det_44f7e3",
    score: 0.87,
    summary: "떨 대마 문의 디엠 주세요 강남 홍대 직거래 가능",
    content: "떨 대마 문의 디엠 주세요. 강남 홍대 직거래 가능합니다. 시간 조율 가능.",
    nickname: "@green_hd_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/green_hd_/status/0552",
    postedAt: "2026-05-28 17:10",
    detectedAt: "2026-05-28 17:16",
    status: "review",
    keywords: ["떨", "대마", "직거래"],
    images: [{}, {}],
  },
  {
    id: "det_20ea9b",
    score: 0.84,
    summary: "던지기 전문 지역 상관없음 후기 채널 운영중",
    content: "던지기 전문입니다. 지역 상관없음. 후기 채널 운영중이니 참고해주세요.",
    nickname: "@drop_master_kr",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/drop_master_kr/status/0534",
    postedAt: "2026-05-28 16:02",
    detectedAt: "2026-05-28 16:09",
    status: "new",
    keywords: ["던지기", "후기"],
    images: [],
  },
  {
    id: "det_6c1d78",
    score: 0.82,
    summary: "케이 빙두 단골만 받습니다 신규는 후기 확인 후",
    content: "케이 빙두 단골만 받습니다. 신규는 후기 확인 후 연락 주세요.",
    nickname: "@regular_only_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/regular_only_/status/0516",
    postedAt: "2026-05-28 14:48",
    detectedAt: "2026-05-28 14:55",
    status: "review",
    keywords: ["케이", "빙두", "단골"],
    images: [{ flagScore: 0.79 }],
  },
  {
    id: "det_e93a15",
    score: 0.78,
    summary: "시그널 아이디 남깁니다 문의는 디엠으로 부탁",
    content: "시그널 아이디 남깁니다. 문의는 디엠으로 부탁드려요.",
    nickname: "@sig_id_drop",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/sig_id_drop/status/0498",
    postedAt: "2026-05-28 13:30",
    detectedAt: "2026-05-28 13:37",
    status: "excluded",
    keywords: ["시그널", "디엠"],
    images: [],
  },
  {
    id: "det_b52f07",
    score: 0.91,
    summary: "급처 물건 있습니다 오늘 안에 정리 텔레 연락",
    content: "급처 물건 있습니다. 오늘 안에 정리하려고 해요. 텔레 연락 주세요.",
    nickname: "@today_clear_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/today_clear_/status/0480",
    postedAt: "2026-05-28 12:15",
    detectedAt: "2026-05-28 12:22",
    status: "new",
    keywords: ["급처", "텔레"],
    images: [{ flagScore: 0.93 }, {}, {}],
  },
  {
    id: "det_0f6b29",
    score: 0.86,
    summary: "작대기 케이 동시 취급 안전거래 우선",
    content: "작대기 케이 동시 취급합니다. 안전거래 우선으로 진행해요.",
    nickname: "@dual_line_kr",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/dual_line_kr/status/0462",
    postedAt: "2026-05-28 11:03",
    detectedAt: "2026-05-28 11:10",
    status: "confirmed",
    keywords: ["작대기", "케이", "안전거래"],
    images: [{}, {}],
  },
  {
    id: "det_7ac340",
    score: 0.8,
    summary: "떨 소량 문의 받아요 첫 거래 할인",
    content: "떨 소량 문의 받아요. 첫 거래 할인 적용해드립니다.",
    nickname: "@small_leaf_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/small_leaf_/status/0444",
    postedAt: "2026-05-28 09:52",
    detectedAt: "2026-05-28 09:58",
    status: "review",
    keywords: ["떨", "소량"],
    images: [],
  },
  {
    id: "det_d17e84",
    score: 0.75,
    summary: "채널 링크 프로필에 있습니다 문의 환영",
    content: "채널 링크 프로필에 있습니다. 문의 환영합니다.",
    nickname: "@profile_link_x",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/profile_link_x/status/0426",
    postedAt: "2026-05-28 08:40",
    detectedAt: "2026-05-28 08:47",
    status: "excluded",
    keywords: ["채널", "링크"],
    images: [],
  },
  {
    id: "det_35b9c1",
    score: 0.89,
    summary: "아이스 던지기 둘다 가능 서울 전지역 커버",
    content: "아이스 던지기 둘다 가능합니다. 서울 전지역 커버해요.",
    nickname: "@seoul_cover_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/seoul_cover_/status/0408",
    postedAt: "2026-05-27 23:31",
    detectedAt: "2026-05-27 23:38",
    status: "new",
    keywords: ["아이스", "던지기"],
    images: [{ flagScore: 0.9 }],
  },
  {
    id: "det_92c508",
    score: 0.83,
    summary: "신상 입고 알림 받으실 분 텔레 추가",
    content: "신상 입고 알림 받으실 분 텔레 추가해주세요.",
    nickname: "@stock_alert_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/stock_alert_/status/0390",
    postedAt: "2026-05-27 22:19",
    detectedAt: "2026-05-27 22:26",
    status: "review",
    keywords: ["신상", "텔레"],
    images: [{}],
  },
  {
    id: "det_4e7f60",
    score: 0.77,
    summary: "후기 많은 곳 찾으시면 연락 주세요 빠른 응답",
    content: "후기 많은 곳 찾으시면 연락 주세요. 빠른 응답 드립니다.",
    nickname: "@many_review_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/many_review_/status/0372",
    postedAt: "2026-05-27 20:58",
    detectedAt: "2026-05-27 21:05",
    status: "confirmed",
    keywords: ["후기"],
    images: [],
  },
  {
    id: "det_a60d3e",
    score: 0.93,
    summary: "빙두 최상급 입고 급처 오늘만 가격 조정",
    content: "빙두 최상급 입고. 급처로 오늘만 가격 조정합니다. 텔레 문의 주세요.",
    nickname: "@top_grade_kr",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/top_grade_kr/status/0354",
    postedAt: "2026-05-27 19:44",
    detectedAt: "2026-05-27 19:51",
    status: "new",
    keywords: ["빙두", "급처", "텔레"],
    images: [{ flagScore: 0.95 }, {}, {}],
  },
  {
    id: "det_18fa77",
    score: 0.74,
    summary: "디엠 확인 늦을 수 있습니다 양해 부탁",
    content: "디엠 확인 늦을 수 있습니다. 양해 부탁드려요.",
    nickname: "@slow_dm_",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/slow_dm_/status/0336",
    postedAt: "2026-05-27 18:26",
    detectedAt: "2026-05-27 18:33",
    status: "excluded",
    keywords: ["디엠"],
    images: [],
  },
  {
    id: "det_5209bd",
    score: 0.88,
    summary: "직거래 던지기 모두 가능 경기권도 문의 주세요",
    content: "직거래 던지기 모두 가능합니다. 경기권도 문의 주세요.",
    nickname: "@gg_area_drop",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/gg_area_drop/status/0318",
    postedAt: "2026-05-27 17:12",
    detectedAt: "2026-05-27 17:19",
    status: "review",
    keywords: ["직거래", "던지기"],
    images: [{}, {}],
  },
  {
    id: "det_ce6a91",
    score: 0.81,
    summary: "텔레그램 채널 신규 오픈 공지 확인 부탁",
    content: "텔레그램 채널 신규 오픈했습니다. 공지 확인 부탁드려요.",
    nickname: "@new_channel_kr",
    platform: "X (Twitter)",
    sourceUrl: "https://x.com/new_channel_kr/status/0300",
    postedAt: "2026-05-27 15:47",
    detectedAt: "2026-05-27 15:54",
    status: "new",
    keywords: ["텔레그램", "채널"],
    images: [],
  },
];

export function findDetection(id: string) {
  return detections.find((item) => item.id === id) ?? null;
}

/** 목록 뱃지에 쓰는 미검토 건수 */
export const unreviewedCount = detections.filter((item) => item.status === "new").length;
