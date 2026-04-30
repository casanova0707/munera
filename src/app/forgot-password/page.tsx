import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <ForgotPasswordForm />;
}
