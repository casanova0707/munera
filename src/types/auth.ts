import type { User } from "@supabase/supabase-js";
import type { UserRole } from "./database";

export interface AuthSession {
  user: User;
  role: UserRole;
  coreUserId: string;
  tenantId: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
