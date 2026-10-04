"use client";

import { Bell, Check, KeyRound, Save, UserCog } from "lucide-react";
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

export default function AccountSettings({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [notificationEnabled, setNotificationEnabled] = useState(initialProfile.notification_enabled);
  const [notificationEmail, setNotificationEmail] = useState(initialProfile.notification_email || initialProfile.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const inFlight = useRef(false);

  async function handleSave() {
    if (inFlight.current) return;
    setError("");
    setSaved(false);

    if ((currentPassword || newPassword || newPasswordConfirm) && newPassword !== newPasswordConfirm) {
      setError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    inFlight.current = true;
    setPending(true);
    try {
      const result = await updateAccount({
        name,
        site_url: FIXED_SITE_URL,
        notification_enabled: notificationEnabled,
        notification_email: notificationEmail,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });
      if (result.success) {
        setProfile(result.profile);
        setName(result.profile.name);
        setNotificationEnabled(result.profile.notification_enabled);
        setNotificationEmail(result.profile.notification_email || result.profile.email);
        setCurrentPassword("");
        setNewPassword("");
        setNewPasswordConfirm("");
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

      <section className={styles.card} aria-labelledby="notify-title">
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
      </section>

      <section className={styles.card} aria-labelledby="password-title">
        <header className={styles.cardHeader}>
          <h2 id="password-title"><KeyRound aria-hidden="true" />비밀번호 변경</h2>
          <small>8자 이상</small>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.help}>비밀번호를 바꾸지 않으려면 아래 입력란을 비워 두세요.</p>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="current-password">현재 비밀번호</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                // "current-password"로 두면 브라우저가 저장된 비밀번호를 자동으로 채우므로
                // 자동 완성을 막는 관례적 값인 "new-password"를 지정한다.
                autoComplete="new-password"
                disabled={pending}
              />
            </div>
          </div>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="new-password">새 비밀번호</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={pending}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-password-confirm">새 비밀번호 확인</label>
              <input
                id="new-password-confirm"
                type="password"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={pending}
              />
            </div>
          </div>
        </div>
      </section>

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
