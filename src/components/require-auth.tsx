import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import styles from "./settings.module.css";

/** 로그인 토큰이 없으면 콘텐츠 대신 로그인 안내를 보여주는 서버 컴포넌트 가드. */
export default async function RequireAuth({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  if (token) return <>{children}</>;

  return (
    <div className={styles.page}>
      <div className={styles.guard} role="status">
        <p>이 화면을 사용하려면 로그인이 필요합니다.</p>
        <Link href="/login">로그인하러 가기</Link>
      </div>
    </div>
  );
}
