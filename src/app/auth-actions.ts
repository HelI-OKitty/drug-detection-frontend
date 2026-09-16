"use server";

import { cookies } from "next/headers";
import { authRequest, submitAuth } from "@/lib/auth-api";

export async function authenticate(mode: "signup" | "login", form: FormData) {
  if (mode !== "signup" && mode !== "login") {
    return { success: false, message: "잘못된 요청입니다." };
  }

  try {
    const data = await submitAuth(mode, form);
    if (mode === "signup") {
      if (typeof data?.id !== "string") throw new Error("서버의 가입 응답을 확인할 수 없습니다.");
      return { success: true, message: "회원가입이 완료되었습니다. 로그인해 주세요." };
    }

    if (typeof data?.access_token !== "string" || !data.access_token ||
        typeof data?.refresh_token !== "string" || !data.refresh_token) {
      throw new Error("서버의 로그인 응답을 확인할 수 없습니다.");
    }

    const profile = await authRequest("/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (typeof profile?.id !== "string" || typeof profile?.name !== "string") {
      throw new Error("사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
    }

    const cookieStore = await cookies();
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    cookieStore.set("sentinel_access_token", data.access_token, options);
    cookieStore.set("sentinel_refresh_token", data.refresh_token, options);

    return { success: true, message: `${profile.name}님, 로그인되었습니다.` };
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
