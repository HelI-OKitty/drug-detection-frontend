import type { Metadata } from "next";
import { ConsoleShell } from "@/components/console-shell";
import MemberInfo from "@/components/member-info";
import RequireAuth from "@/components/require-auth";
import PasswordSettings from "@/components/password-settings";

export const metadata: Metadata = { title: "비밀번호 변경 | SENTINEL" };

export default function PasswordPage() {
  return <ConsoleShell memberInfo={<MemberInfo />}>
    <main><RequireAuth><PasswordSettings /></RequireAuth></main>
  </ConsoleShell>;
}
