import { redirect } from "next/navigation";

/** 크롤링 관리 화면은 모니터링 메뉴의 크롤링 모니터링(/monitoring)으로 통합되었다. */
export default function CrawlAdminPage() {
  redirect("/monitoring");
}
