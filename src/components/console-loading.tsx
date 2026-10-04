import { ConsoleShell } from "./console-shell";
import styles from "./console.module.css";

type Variant = "dashboard" | "table" | "detail" | "cards";

/** 라우트 전환 중 실제 화면 틀을 흉내 낸 스켈레톤을 보여준다. */
function SkeletonBlocks({ variant }: { variant: Variant }) {
  if (variant === "dashboard") {
    return (
      <div className={styles.skPage}>
        <div className={styles.metrics}>
          {Array.from({ length: 4 }, (_, index) => (
            <i key={index} className={`${styles.sk} ${styles.skMetric}`} />
          ))}
        </div>
        <div className={styles.panels}>
          <i className={`${styles.sk} ${styles.skPanel}`} />
          <i className={`${styles.sk} ${styles.skPanel}`} />
        </div>
      </div>
    );
  }
  if (variant === "table") {
    return (
      <div className={styles.skPage}>
        <div className={styles.skToolbar}>
          <i className={`${styles.sk} ${styles.skSearch}`} />
          {Array.from({ length: 4 }, (_, index) => (
            <i key={index} className={`${styles.sk} ${styles.skChip}`} />
          ))}
        </div>
        <div className={styles.skCard}>
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className={styles.skTableRow}>
              <i className={`${styles.sk} ${styles.skCell}`} />
              <i className={`${styles.sk} ${styles.skCellWide}`} />
              <i className={`${styles.sk} ${styles.skCell}`} />
              <i className={`${styles.sk} ${styles.skCellSmall}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className={styles.skPage}>
        <div className={styles.skDetail}>
          <i className={`${styles.sk} ${styles.skPost}`} />
          <div className={styles.skAside}>
            <i className={`${styles.sk} ${styles.skAsideCard}`} />
            <i className={`${styles.sk} ${styles.skAsideCard}`} />
            <i className={`${styles.sk} ${styles.skAsideCard}`} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.skPage} ${styles.skNarrow}`}>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className={styles.skCard}>
          <i className={`${styles.sk} ${styles.skTitle}`} />
          <i className={`${styles.sk} ${styles.skLine}`} />
          <i className={`${styles.sk} ${styles.skLine}`} />
          <i className={`${styles.sk} ${styles.skLineShort}`} />
        </div>
      ))}
    </div>
  );
}

export default function ConsoleLoading({ variant = "cards" }: { variant?: Variant }) {
  return (
    <ConsoleShell memberInfo={null}>
      <div role="status" aria-label="화면을 불러오는 중">
        <SkeletonBlocks variant={variant} />
      </div>
    </ConsoleShell>
  );
}
