import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // パスワードリセットのフローでは、リカバリートークンで一時的にログイン状態になる
  // ユーザーがいない場合はトップに戻す
  if (!user) {
    redirect("/");
  }

  return <ResetPasswordForm />;
}
