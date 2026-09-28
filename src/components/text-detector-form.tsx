"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { detectText } from "@/app/text-detector/actions";

export default function TextDetectorForm() {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setResult(null);
    setError("");
    if (!text.trim()) {
      setError("분석할 텍스트를 입력해 주세요.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      const response = await detectText(text);
      if (response.success) setResult(response.isDrug);
      else setError(response.message);
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-10" aria-labelledby="detector-title">
        <header className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="auth-brand"><span aria-hidden="true" />SENTINEL</div>
            <Link href="/" className="text-sm text-slate-500 hover:text-emerald-700">홈으로</Link>
          </div>
          <h1 id="detector-title" className="mt-8 text-2xl font-semibold tracking-tight">텍스트 분석</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">게시글 내용을 입력하면 마약 관련 의심 여부를 분석합니다.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label htmlFor="analysis-text" className="mb-3 block text-sm font-medium text-slate-700">분석할 텍스트</label>
          <textarea
            id="analysis-text"
            name="text"
            rows={8}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setResult(null);
              setError("");
            }}
            placeholder="분석할 게시글이나 문장을 입력하거나 붙여넣으세요."
            required
            disabled={pending}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "detector-error" : undefined}
            className="block min-h-48 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus-visible:outline-1 focus-visible:-outline-offset-2 disabled:opacity-60"
          />
          <p className="mt-2 text-right text-xs text-slate-500">{text.length.toLocaleString("ko-KR")}자</p>
          <button type="submit" disabled={pending || !text.trim()} className="submit-button disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? "분석 중…" : "텍스트 분석하기"}<ArrowRight aria-hidden="true" />
          </button>
        </form>

        <div role="status" aria-live="polite" aria-atomic="true">
          {pending && <p className="mt-5 text-sm text-slate-500">텍스트를 분석하고 있습니다. 잠시만 기다려 주세요.</p>}
          {error && <p id="detector-error" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {result !== null && (
            <section className={`mt-6 rounded-xl border p-5 ${result ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`} aria-labelledby="result-title">
              <p className="text-xs font-medium">분석 완료</p>
              <h2 id="result-title" className="mt-2 text-lg font-semibold">{result ? "마약 관련 의심 신호가 탐지되었습니다" : "마약 관련 의심 신호가 탐지되지 않았습니다"}</h2>
              <p className="mt-2 text-sm leading-6">{result ? "게시글의 내용과 맥락을 추가로 확인해 주세요." : "입력한 텍스트에서 마약 관련 의심 신호를 찾지 못했습니다."}</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
