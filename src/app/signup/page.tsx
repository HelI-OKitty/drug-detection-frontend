import Link from "next/link";
import AuthForm from "@/components/auth-form";
import { SIGNUP_ENABLED } from "@/lib/auth-api";

export default function Page() {
  // 다시 열려면 SIGNUP_ENABLED=true를 설정하고 재배포한다.
  if (!SIGNUP_ENABLED) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="auth-title">
          <header className="auth-header">
            <div className="auth-brand"><span aria-hidden="true" />SENTINEL</div>
            <h1 id="auth-title">회원가입 · 모니터링 콘솔</h1>
          </header>
          <div className="auth-guide" role="status">
            <p className="guide-title">회원가입 일시 중단</p>
            <p>현재는 회원가입을 받지 않습니다. 계정이 필요하면 관리자에게 문의해 주세요.</p>
          </div>
          <p className="auth-footer">
            이미 계정이 있다면<Link href="/login">로그인</Link>
          </p>
        </section>
      </main>
    );
  }
  return <AuthForm mode="signup" />;
}
