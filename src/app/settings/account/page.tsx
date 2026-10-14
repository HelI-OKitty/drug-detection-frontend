import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import AccountSettings from "@/components/account-settings";
import { ConsoleShell } from "@/components/console-shell";
import MemberInfo from "@/components/member-info";
import { parseProfile, type Profile } from "@/lib/profile";
import styles from "@/components/settings.module.css";

export const metadata: Metadata = { title: "계정 관리 | SENTINEL" };

export default async function AccountSettingsPage() {
  const token = (await cookies()).get("sentinel_access_token")?.value;
  let profile: Profile | null = null;
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
        profile = parseProfile(await response.json());
        if (!profile) unavailable = true;
      } else if (response.status !== 401 && response.status !== 403) {
        unavailable = true;
      }
    } catch {
      unavailable = true;
    }
  }

  return (
    <ConsoleShell memberInfo={<MemberInfo />}>
      <main>
        {profile ? (
          <AccountSettings initialProfile={profile} />
        ) : (
          <div className={styles.page}>
            <div className={styles.guard} role="status">
              {unavailable ? (
                <p>회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
              ) : (
                <>
                  <p>계정 관리를 사용하려면 로그인이 필요합니다.</p>
                  <Link href="/login">로그인하러 가기</Link>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </ConsoleShell>
  );
}
