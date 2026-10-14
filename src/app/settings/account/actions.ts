"use server";

import { cookies } from "next/headers";
import { authRequest } from "@/lib/auth-api";
import { parseProfile, type Profile } from "@/lib/profile";

export interface AccountUpdateInput {
  name: string;
  site_url: string;
  notification_enabled: boolean;
  notification_email: string;
  current_password?: string;
  new_password?: string;
}

export async function updateAccount(input: AccountUpdateInput): Promise<
  { success: true; profile: Profile } | { success: false; message: string }
> {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (!token) return { success: false, message: "로그인이 필요합니다. 다시 로그인해 주세요." };

  const name = input.name.trim();
  const notificationEmail = input.notification_email.trim();
  if (!name) return { success: false, message: "이름을 입력해 주세요." };
  if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    return { success: false, message: "알림을 받을 이메일 주소를 확인해 주세요." };
  }
  if (input.notification_enabled && !notificationEmail) {
    return { success: false, message: "알림을 받을 이메일 주소를 입력해 주세요." };
  }

  // AdminUpdate 스키마는 부분 수정이 가능하고, notification_email은 이메일 형식 또는 null만 허용한다.
  const body: Record<string, unknown> = {
    name,
    site_url: input.site_url.trim() || null,
    notification_enabled: input.notification_enabled,
    notification_email: notificationEmail || null,
  };

  // 비밀번호는 두 값이 모두 있을 때만 변경 요청에 포함한다. (current_password는 변경 시 필수)
  if (input.current_password || input.new_password) {
    if (!input.current_password || !input.new_password) {
      return { success: false, message: "비밀번호를 변경하려면 현재 비밀번호와 새 비밀번호를 모두 입력해 주세요." };
    }
    if (input.new_password.length < 8) {
      return { success: false, message: "새 비밀번호는 8자 이상으로 설정해 주세요." };
    }
    body.current_password = input.current_password;
    body.new_password = input.new_password;
  }

  try {
    const data = await authRequest("/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const profile = parseProfile(data);
    if (!profile) throw new Error("서버의 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    return { success: true, profile };
  } catch (error) {
    const networkError = error instanceof TypeError ||
      (error instanceof Error && ["TimeoutError", "AbortError", "SyntaxError"].includes(error.name));
    return {
      success: false,
      message: networkError || !(error instanceof Error)
        ? "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : error.message,
    };
  }
}
