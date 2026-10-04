"use client";

import Link from "next/link";
import { ArrowLeft, AtSign, Check, ImageIcon, X } from "lucide-react";
import { Fragment, useState } from "react";
import {
  RISK_LABEL,
  STATUS_LABEL,
  riskBand,
  shortUrl,
  type Detection,
  type ReviewStatus,
} from "@/lib/detections-sample";
import styles from "./detections.module.css";

const GAUGE_RADIUS = 63;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

/** 본문에서 탐지 키워드에 해당하는 구간을 <mark>로 감싼다. */
function highlightKeywords(content: string, keywords: string[]) {
  const targets = keywords.filter(Boolean);
  if (targets.length === 0) return content;

  const pattern = targets
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts = content.split(new RegExp(`(${pattern})`, "g"));

  return parts.map((part, index) =>
    targets.includes(part)
      ? <mark key={`${part}-${index}`}>{part}</mark>
      : <Fragment key={`text-${index}`}>{part}</Fragment>,
  );
}

export default function DetectionDetail({ detection }: { detection: Detection }) {
  const [status, setStatus] = useState<ReviewStatus>(detection.status);
  const band = riskBand(detection.score);
  const resolved = status === "confirmed" || status === "excluded";

  return (
    <div className={styles.page}>
      <Link href="/detections" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" />목록으로
      </Link>

      <p className={styles.demoLabel}><i />화면 예시 · 실제 운영 데이터가 아닙니다</p>

      <div className={styles.detailLayout}>
        <article className={styles.postCard}>
          <header className={styles.postHeader}>
            <span className={styles.avatar} aria-hidden="true"><AtSign /></span>
            <div className={styles.postIdentity}>
              <strong>{detection.nickname}</strong>
              <span>{detection.platform} · 게시 {detection.postedAt}</span>
            </div>
            <span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span>
          </header>

          <p className={styles.postContent}>
            {highlightKeywords(detection.content, detection.keywords)}
          </p>

          {detection.images.length > 0 ? (
            <div className={styles.images}>
              {detection.images.map((image, index) => (
                <div className={styles.imageBox} key={index}>
                  <ImageIcon aria-hidden="true" />
                  {image.flagScore !== undefined && (
                    <span className={styles.flagBadge}>FLAG {image.flagScore.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noImages}>첨부된 이미지가 없습니다.</p>
          )}
        </article>

        <aside className={styles.aside}>
          <section className={styles.asideCard} aria-labelledby="risk-title">
            <h2 className={styles.asideTitle} id="risk-title">AI 위험 점수</h2>
            <div className={styles.gaugeWrap}>
              <div className={styles.gauge} data-band={band}>
                <svg viewBox="0 0 150 150" aria-hidden="true">
                  <circle className={styles.gaugeTrack} cx="75" cy="75" r={GAUGE_RADIUS} />
                  <circle
                    className={styles.gaugeValue}
                    cx="75"
                    cy="75"
                    r={GAUGE_RADIUS}
                    strokeDasharray={`${(GAUGE_CIRCUMFERENCE * detection.score).toFixed(2)} ${GAUGE_CIRCUMFERENCE.toFixed(2)}`}
                  />
                </svg>
                <div className={styles.gaugeText}>
                  <strong className={styles.gaugeScore}>{detection.score.toFixed(2)}</strong>
                  <small className={styles.gaugeBand}>{RISK_LABEL[band]}</small>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.asideCard} aria-labelledby="meta-title">
            <h2 className={styles.asideTitle} id="meta-title">메타데이터</h2>
            <dl className={styles.metaList}>
              <div className={styles.metaRow}><dt>post_id</dt><dd>{detection.id}</dd></div>
              <div className={styles.metaRow}><dt>posted_at</dt><dd>{detection.postedAt.slice(5)}</dd></div>
              <div className={styles.metaRow}><dt>detected_at</dt><dd>{detection.detectedAt.slice(5)}</dd></div>
              <div className={styles.metaRow}>
                <dt>source_url</dt>
                <dd>
                  <a href={detection.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {shortUrl(detection.sourceUrl)}
                  </a>
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>status</dt>
                <dd><span className={styles.status} data-status={status}>{STATUS_LABEL[status]}</span></dd>
              </div>
            </dl>
          </section>

          <section className={styles.asideCard} aria-labelledby="keyword-title">
            <h2 className={styles.asideTitle} id="keyword-title">탐지 키워드</h2>
            <div className={styles.keywords}>
              {detection.keywords.map((keyword) => (
                <span className={styles.keyword} key={keyword}>{keyword}</span>
              ))}
            </div>
          </section>

          <section className={styles.asideCard} aria-labelledby="action-title">
            <h2 className={styles.asideTitle} id="action-title">처리</h2>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => setStatus("confirmed")}
                disabled={status === "confirmed"}
              >
                <Check aria-hidden="true" />마약 게시글 확정
              </button>
              <button
                type="button"
                className={styles.excludeButton}
                onClick={() => setStatus("excluded")}
                disabled={status === "excluded"}
              >
                <X aria-hidden="true" />오탐 · 제외
              </button>
            </div>
            <p className={styles.actionNote} role="status">
              {resolved
                ? `현재 화면에서만 '${STATUS_LABEL[status]}'로 표시됩니다. 서버에는 저장되지 않습니다.`
                : "아직 서버에 저장되지 않는 화면 예시입니다."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
