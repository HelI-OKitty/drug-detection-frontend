"use client";

import Link from "next/link";
import { Bell, Check, ChevronRight, KeyRound, Save, UserCog } from "lucide-react";
import { useRef, useState } from "react";
import { updateAccount } from "@/app/settings/account/actions";
import type { Profile } from "@/lib/profile";
import styles from "./settings.module.css";

function joinedAt(createdAt: string) {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/** 모니터링 대상은 현재 X(x.com)만 지원해 고정값으로 보낸다. */
const FIXED_SITE_URL = "x.com";
const SHOW_NOTIFICATION_SETTINGS = false;

export default function AccountSettings({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [notificationEnabled, setNotificationEnabled] = useState(initialProfile.notification_enabled);
  const [notificationEmail, setNotificationEmail] = useState(initialProfile.notification_email || (SHOW_NOTIFICATION_SETTINGS ? initialProfile.email : ""));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const inFlight = useRef(false);

  async function handleSave() {
    if (inFlight.current) return;
    setError("");
    setSaved(false);

    inFlight.current = true;
    setPending(true);
    try {
      const result = await updateAccount({
        name,
        site_url: FIXED_SITE_URL,
        notification_enabled: notificationEnabled,
        notification_email: notificationEmail,
      });
      if (result.success) {
        setProfile(result.profile);
        setName(result.profile.name);
        setNotificationEnabled(result.profile.notification_enabled);
        setNotificationEmail(result.profile.notification_email || (SHOW_NOTIFICATION_SETTINGS ? result.profile.email : ""));
        setSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaved(false), 2500);
      } else {
        setError(result.message);
      }
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card} aria-labelledby="account-title">
        <header className={styles.cardHeader}>
          <h2 id="account-title"><UserCog aria-hidden="true" />기본 정보</h2>
          <small>가입일 {joinedAt(profile.created_at)}</small>
        </header>
        <div className={styles.cardBody}>
          <dl className={styles.infoList}>
            <div className={styles.infoRow}><dt>이메일</dt><dd>{profile.email}</dd></div>
            <div className={styles.infoRow}><dt>회원 ID</dt><dd>{profile.id}</dd></div>
          </dl>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="account-name">이름</label>
              <input
                id="account-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={30}
                disabled={pending}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="account-site-url">모니터링 사이트 URL</label>
              <input id="account-site-url" type="text" value={FIXED_SITE_URL} readOnly disabled aria-label="모니터링 사이트 URL (고정)" />
            </div>
          </div>
        </div>
      </section>

      {SHOW_NOTIFICATION_SETTINGS && <section className={styles.card} aria-labelledby="notify-title">
        <header className={styles.cardHeader}>
          <h2 id="notify-title"><Bell aria-hidden="true" />알림 설정</h2>
          <small>{notificationEnabled ? "사용 중" : "꺼짐"}</small>
        </header>
        <div className={styles.cardBody}>
          <div className={styles.switchRow}>
            <div>
              <p className={styles.switchLabel}>이메일 알림</p>
              <p className={styles.help}>새 탐지 게시글이 발견되면 이메일로 알려드립니다.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationEnabled}
              aria-label="이메일 알림 사용"
              className={styles.switch}
              onClick={() => setNotificationEnabled((value) => !value)}
              disabled={pending}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="notification-email">알림 받을 이메일</label>
            <input
              id="notification-email"
              type="email"
              value={notificationEmail}
              onChange={(event) => setNotificationEmail(event.target.value)}
              placeholder="user@example.com"
              disabled={pending || !notificationEnabled}
            />
          </div>
        </div>
      </section>}

      <Link href="/settings/account/password" className={styles.passwordLink}>
        <KeyRound aria-hidden="true" /><span>비밀번호 변경하기</span><ChevronRight aria-hidden="true" />
      </Link>

      <div className={styles.footer}>
        <p role="status" aria-live="polite" className={error ? styles.error : styles.savedNote}>
          {error}
          {saved && !error && <><Check aria-hidden="true" />계정 정보가 저장되었습니다.</>}
        </p>
        <button type="button" className={styles.saveButton} onClick={handleSave} disabled={pending || !name.trim()}>
          <Save aria-hidden="true" />{pending ? "저장 중…" : "변경사항 저장"}
        </button>
      </div>
    </div>
  );
}
