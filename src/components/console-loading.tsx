import { ConsoleShell } from "./console-shell";
import styles from "./console.module.css";

/** 라우트 전환 중 사이드바를 유지한 채 콘텐츠 영역만 로딩 표시를 보여준다. */
export default function ConsoleLoading() {
  return (
    <ConsoleShell memberInfo={null}>
      <div className={styles.loading} role="status" aria-label="불러오는 중">
        <i /><i /><i />
      </div>
    </ConsoleShell>
  );
}
