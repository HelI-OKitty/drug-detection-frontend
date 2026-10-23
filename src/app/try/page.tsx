import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AnalyzeForm from "@/components/analyze-form";
import homeStyles from "../home.module.css";
import styles from "./try.module.css";

export const metadata: Metadata = {
  title: "체험하기 | SENTINEL",
  description: "로그인·회원가입 없이 게시글 텍스트와 이미지를 입력하고 마약 관련 의심 여부를 확인하세요.",
};

export default function TryPage() {
  return (
    <div className={homeStyles.home}>
      <header className={homeStyles.header}>
        <div className={homeStyles.headerInner}>
          <Link href="/" className={homeStyles.brand}><i />SENTINEL</Link>
          <div className={homeStyles.headerActions}>
            <Link href="/" className={styles.backLink}><ArrowLeft aria-hidden="true" />홈으로</Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>SENTINEL 체험하기</h1>
          <p>로그인·회원가입 없이 텍스트나 이미지를 넣고 분석 결과를 확인하세요.</p>
        </div>
        <AnalyzeForm title="게시글 분석 체험" />
      </main>
    </div>
  );
}
