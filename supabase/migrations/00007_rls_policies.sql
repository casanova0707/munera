-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS
ALTER TABLE core_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE attn_clocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attn_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE attn_overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE attn_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_receipt_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM core_users
  WHERE supabase_auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM core_users
  WHERE supabase_auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_core_user_id()
RETURNS UUID AS $$
  SELECT id FROM core_users
  WHERE supabase_auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- core_users: Staff sees self, SV sees same tenant, Admin sees all in tenant
CREATE POLICY "users_self_read" ON core_users
  FOR SELECT USING (supabase_auth_id = auth.uid());

CREATE POLICY "users_admin_all" ON core_users
  FOR ALL USING (
    auth_role() IN ('sv', 'admin')
    AND tenant_id = auth_tenant_id()
  );

-- core_tenants: users can read their own tenant
CREATE POLICY "tenants_read" ON core_tenants
  FOR SELECT USING (id = auth_tenant_id());

CREATE POLICY "tenants_admin" ON core_tenants
  FOR ALL USING (auth_role() = 'admin' AND id = auth_tenant_id());

-- core_workplaces: readable by all in tenant, writable by admin
CREATE POLICY "workplaces_read" ON core_workplaces
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "workplaces_admin" ON core_workplaces
  FOR ALL USING (auth_role() = 'admin' AND tenant_id = auth_tenant_id());

-- attn_clocks: Staff sees own, SV/Admin sees tenant
CREATE POLICY "clocks_staff_own" ON attn_clocks
  FOR ALL USING (user_id = auth_core_user_id());

CREATE POLICY "clocks_sv_read" ON attn_clocks
  FOR SELECT USING (
    auth_role() IN ('sv', 'admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- attn_daily_summary
CREATE POLICY "summary_staff_own" ON attn_daily_summary
  FOR SELECT USING (user_id = auth_core_user_id());

CREATE POLICY "summary_sv_read" ON attn_daily_summary
  FOR SELECT USING (
    auth_role() IN ('sv', 'admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- attn_overtime
CREATE POLICY "overtime_staff_own" ON attn_overtime
  FOR SELECT USING (user_id = auth_core_user_id());

CREATE POLICY "overtime_admin" ON attn_overtime
  FOR ALL USING (
    auth_role() IN ('sv', 'admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- exp_applications
CREATE POLICY "exp_staff_own" ON exp_applications
  FOR ALL USING (user_id = auth_core_user_id());

CREATE POLICY "exp_admin_read" ON exp_applications
  FOR SELECT USING (
    auth_role() IN ('sv', 'admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- exp_receipt_images: follows application access
CREATE POLICY "receipt_staff" ON exp_receipt_images
  FOR ALL USING (
    application_id IN (SELECT id FROM exp_applications WHERE user_id = auth_core_user_id())
  );

CREATE POLICY "receipt_admin" ON exp_receipt_images
  FOR SELECT USING (
    auth_role() IN ('sv', 'admin')
    AND application_id IN (
      SELECT ea.id FROM exp_applications ea
      JOIN core_users cu ON ea.user_id = cu.id
      WHERE cu.tenant_id = auth_tenant_id()
    )
  );

-- sys_audit_logs: admin read-only
CREATE POLICY "audit_admin_read" ON sys_audit_logs
  FOR SELECT USING (auth_role() = 'admin');
