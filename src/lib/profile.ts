/** 회원 프로필 (GET·PATCH /profile, AdminOut 스키마). site_url과 notification_email은 서버에서 null일 수 있다. */
export interface Profile {
  id: string;
  email: string;
  name: string;
  site_url: string | null;
  notification_enabled: boolean;
  notification_email: string | null;
  created_at: string;
}

/** 서버 응답을 Profile로 검증·정규화한다. 필수 필드가 없으면 null을 돌려준다. */
export function parseProfile(value: unknown): Profile | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.email !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    created_at: raw.created_at,
    site_url: typeof raw.site_url === "string" ? raw.site_url : null,
    notification_enabled: raw.notification_enabled === true,
    notification_email: typeof raw.notification_email === "string" ? raw.notification_email : null,
  };
}
