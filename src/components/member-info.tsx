import Link from "next/link";
import { cookies } from "next/headers";
import styles from "./member-info.module.css";

export default async function MemberInfo() {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  let member: { name: string; email: string } | null = null;
  let unavailable = false;

  if (token) {
    try {
      const baseUrl = process.env.BACKEND_API_URL || "https://drug-detection-671085027854.asia-northeast3.run.app";
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) {
        const profile = await response.json();
        if (typeof profile?.name === "string" && typeof profile?.email === "string") {
          member = { name: profile.name, email: profile.email };
        } else {
          unavailable = true;
        }
      } else if (response.status !== 401 && response.status !== 403) {
        unavailable = true;
      }
    } catch {
      unavailable = true;
    }
  }

  if (member) {
    return (
      <div className={styles.member} aria-label="로그인한 회원 정보">
        <span className={styles.avatar} aria-hidden="true">{member.name.slice(0, 1)}</span>
        <div className={styles.details}><span className={styles.name}>{member.name}님</span><span className={styles.email} title={member.email}>{member.email}</span></div>
      </div>
    );
  }

  if (unavailable) {
    return <span className={styles.unavailable} role="status">회원 정보를 불러오지 못했습니다.</span>;
  }

  return <div className={styles.links}><Link href="/login">로그인</Link><Link href="/signup" className={styles.start}>시작하기</Link></div>;
}
