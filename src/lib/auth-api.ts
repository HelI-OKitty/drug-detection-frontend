const DEFAULT_API_URL = "https://drug-detection-671085027854.asia-northeast3.run.app";

export async function authRequest(path: string, init: RequestInit) {
  const baseUrl = process.env.BACKEND_API_URL || DEFAULT_API_URL;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("이메일 또는 비밀번호를 확인해 주세요.");
    }
    if (path === "/auth/signup" && (response.status === 400 || response.status === 409)) {
      throw new Error("가입 정보를 확인해 주세요. 이미 가입한 이메일이라면 로그인해 주세요.");
    }
    if (response.status === 422) throw new Error("입력한 정보의 형식을 확인해 주세요.");
    if (response.status === 429) throw new Error("요청이 많습니다. 잠시 후 다시 시도해 주세요.");
    throw new Error("서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return response.json();
}

export async function submitAuth(mode: "signup" | "login", form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    throw new Error("이메일과 비밀번호를 확인해 주세요.");
  }
  if (mode === "signup") {
    if (!name) throw new Error("이름을 입력해 주세요.");
    if (password.length < 8) throw new Error("비밀번호는 8자 이상으로 설정해 주세요.");
    if (password !== form.get("passwordConfirmation")) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }
  }

  return authRequest(`/auth/${mode}`, {
    method: "POST",
    body: JSON.stringify(mode === "signup" ? { email, password, name } : { email, password }),
  });
}
