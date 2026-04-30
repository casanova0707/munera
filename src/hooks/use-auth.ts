"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type UserRole = "staff" | "sv" | "admin";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  coreUserId: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    coreUserId: null,
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: coreUser } = await supabase
          .from("core_users")
          .select("id, role")
          .eq("supabase_auth_id", user.id)
          .single();

        setState({
          user,
          role: coreUser?.role ?? null,
          coreUserId: coreUser?.id ?? null,
          isLoading: false,
        });
      } else {
        setState({ user: null, role: null, coreUserId: null, isLoading: false });
      }
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setState({ user: null, role: null, coreUserId: null, isLoading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
