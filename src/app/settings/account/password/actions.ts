"use server";

import { cookies } from "next/headers";
import { authRequest } from "@/lib/auth-api";

export async function changePassword(form: FormData): Promise<{ success: true } | { success: false; message: string }> {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (!token) return { success: false, message: "로그인이 필요합니다. 다시 로그인해 주세요." };
  const current = form.get("currentPassword");
  const password = form.get("newPassword");
  const confirmation = form.get("confirmation");
  if (typeof current !== "string" || !current || typeof password !== "string" || !password) {
    return { success: false, message: "현재 비밀번호와 새 비밀번호를 입력해 주세요." };
  }
  if (password.length < 8) return { success: false, message: "새 비밀번호는 8자 이상으로 설정해 주세요." };
  if (password !== confirmation) return { success: false, message: "새 비밀번호가 일치하지 않습니다." };
  try {
    await authRequest("/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: current, new_password: password }),
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error && !(error instanceof TypeError) && !["TimeoutError", "AbortError", "SyntaxError"].includes(error.name)
      ? error.message : "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
