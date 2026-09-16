"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authenticate } from "@/app/auth-actions";

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const isSignup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function validatePasswords(event: FormEvent<HTMLFormElement>) {
    setMessage("");
    if (!isSignup) return;

    const form = event.currentTarget;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    const confirmation = form.elements.namedItem("passwordConfirmation") as HTMLInputElement;
    confirmation.setCustomValidity(
      confirmation.value && confirmation.value !== password.value
        ? "비밀번호가 일치하지 않습니다. 다시 확인해 주세요."
        : "",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage("");
    try {
      const result = await authenticate(mode, data);
      if (result.success) {
        // Start a fresh document after authentication to discard cached redirects.
        window.location.replace(isSignup ? "/login" : "/");
        return;
      }
      setMessage(result.message);
    } catch {
      setMessage("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setPending(false);
    setShowPassword(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <header className="auth-header">
          <div className="auth-brand"><span aria-hidden="true" />SENTINEL</div>
          <h1 id="auth-title">{isSignup ? "회원가입" : "로그인"} · 모니터링 콘솔</h1>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} onInput={validatePasswords}>
          <fieldset className="auth-fields" disabled={pending}>
          {isSignup && (
            <div className="form-field">
              <label htmlFor="name">이름</label>
              <input id="name" name="name" autoComplete="name" placeholder="이름을 입력하세요" required />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="email">이메일</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" required />
          </div>
          <div className="form-field">
            <label htmlFor="password">비밀번호</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="비밀번호를 입력하세요"
                minLength={isSignup ? 8 : undefined}
                aria-describedby={isSignup ? "password-hint" : undefined}
                required
              />
              <button className="password-toggle" type="button" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {!showPassword ? (
                    <path d="M3 8c3 8 15 8 18 0M5 11l-2 3m6-1-1 4m7-4 1 4m3-6 2 3" />
                  ) : (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {isSignup && <p className="field-hint" id="password-hint">비밀번호는 8자 이상으로 설정해 주세요.</p>}
          </div>
          {isSignup && (
            <div className="form-field">
              <label htmlFor="passwordConfirmation">비밀번호 확인</label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력하세요"
                required
              />
            </div>
          )}
          <button className="submit-button" type="submit" disabled={pending}>
            {pending ? "처리 중…" : isSignup ? "계정 만들기" : "로그인"}<span aria-hidden="true">→</span>
          </button>
          </fieldset>
          <p className="form-message form-error" role="status">{message}</p>
        </form>

        <aside className="auth-guide" aria-label="서비스 안내">
          <p className="guide-title">{isSignup ? "안전한 모니터링의 시작" : "다시 오신 것을 환영합니다"}</p>
          <p>의심 게시글을 확인하고,<br />탐지 결과를 한곳에서 관리하세요.</p>
        </aside>
        <p className="auth-footer">
          {isSignup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "로그인" : "회원가입"}</Link>
        </p>
      </section>
    </main>
  );
}
