"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { changePassword } from "@/app/settings/account/password/actions";
import styles from "./settings.module.css";

export default function PasswordSettings() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmation")) {
      setMessage("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setMessage("");
    try {
      const result = await changePassword(data);
      if (result.success) {
        form.reset();
        setSaved(true);
      } else setMessage(result.message);
    } catch {
      setMessage("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <div className={styles.page}>
    <Link href="/settings/account" className={styles.passwordBack}><ArrowLeft size={16} aria-hidden="true" />계정 관리로</Link>
    <section className={styles.card} aria-labelledby="password-title">
      <header className={styles.cardHeader}><h1 id="password-title" className={styles.passwordTitle}>비밀번호 변경</h1></header>
      <div className={styles.cardBody}>
        {saved ? <div className={styles.passwordForm}>
          <p className={styles.savedNote} role="status">비밀번호가 변경되었습니다.</p>
          <Link href="/settings/account" className={styles.inlineLink}>계정 관리로 돌아가기</Link>
        </div> : <form className={styles.passwordForm} onSubmit={submit}>
          <fieldset disabled={pending} className={styles.passwordFields}>
            <div className={styles.field}><label htmlFor="current-password">현재 비밀번호</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /></div>
            <div className={styles.field}><label htmlFor="new-password">새 비밀번호</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} aria-describedby="password-hint" required /><p id="password-hint" className={styles.help}>8자 이상 입력해 주세요.</p></div>
            <div className={styles.field}><label htmlFor="confirm-password">새 비밀번호 확인</label><input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></div>
          </fieldset>
          <p className={styles.error} role="status">{message}</p>
          <button type="submit" className={styles.saveButton} disabled={pending}>{pending ? "변경 중…" : "비밀번호 변경"}</button>
        </form>}
      </div>
    </section>
  </div>;
}
