import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LoginForm from "@/components/auth/login-form";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
