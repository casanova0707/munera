-- ============================================================
-- RLS Remediation
-- - Enable RLS on tables missed in 00007
-- - Add policies for attn_approvals / exp_approvals
-- - Pin search_path on SECURITY DEFINER and plpgsql functions
-- ============================================================

-- Enable RLS on remaining tables
ALTER TABLE attn_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attn_user_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_table_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_line_notifications ENABLE ROW LEVEL SECURITY;

-- attn_shifts: tenant-scoped read, admin write
CREATE POLICY "shifts_read" ON attn_shifts
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "shifts_admin" ON attn_shifts
  FOR ALL USING (auth_role() IN ('sv','admin') AND tenant_id = auth_tenant_id());

-- attn_user_shifts: staff sees own, admin sees tenant
CREATE POLICY "user_shifts_staff_own" ON attn_user_shifts
  FOR SELECT USING (user_id = auth_core_user_id());

CREATE POLICY "user_shifts_admin" ON attn_user_shifts
  FOR ALL USING (
    auth_role() IN ('sv','admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- attn_approvals: readable by approver or sv/admin, writable by sv/admin
CREATE POLICY "attn_approvals_read" ON attn_approvals
  FOR SELECT USING (
    approver_id = auth_core_user_id()
    OR auth_role() IN ('sv','admin')
  );

CREATE POLICY "attn_approvals_write" ON attn_approvals
  FOR INSERT WITH CHECK (
    auth_role() IN ('sv','admin')
    AND approver_id = auth_core_user_id()
  );

-- exp_categories: tenant-scoped read, admin write
CREATE POLICY "exp_categories_read" ON exp_categories
  FOR SELECT USING (tenant_id = auth_tenant_id());

CREATE POLICY "exp_categories_admin" ON exp_categories
  FOR ALL USING (auth_role() = 'admin' AND tenant_id = auth_tenant_id());

-- exp_approvals: staff sees own application's, sv/admin writes
CREATE POLICY "exp_approvals_staff_read" ON exp_approvals
  FOR SELECT USING (
    application_id IN (SELECT id FROM exp_applications WHERE user_id = auth_core_user_id())
  );

CREATE POLICY "exp_approvals_admin_read" ON exp_approvals
  FOR SELECT USING (
    auth_role() IN ('sv','admin')
    AND application_id IN (
      SELECT ea.id FROM exp_applications ea
      JOIN core_users cu ON ea.user_id = cu.id
      WHERE cu.tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY "exp_approvals_admin_write" ON exp_approvals
  FOR INSERT WITH CHECK (
    auth_role() IN ('sv','admin')
    AND approver_id = auth_core_user_id()
  );

-- sys_table_metadata: readable by all authenticated
CREATE POLICY "sys_metadata_read" ON sys_table_metadata
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- sys_settings: tenant-scoped read, admin write
CREATE POLICY "sys_settings_read" ON sys_settings
  FOR SELECT USING (tenant_id IS NULL OR tenant_id = auth_tenant_id());

CREATE POLICY "sys_settings_admin" ON sys_settings
  FOR ALL USING (auth_role() = 'admin' AND (tenant_id IS NULL OR tenant_id = auth_tenant_id()));

-- sys_line_notifications: staff sees own, admin all tenant
CREATE POLICY "line_notif_staff_own" ON sys_line_notifications
  FOR SELECT USING (recipient_id = auth_core_user_id());

CREATE POLICY "line_notif_admin" ON sys_line_notifications
  FOR ALL USING (
    auth_role() IN ('sv','admin')
    AND recipient_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- Fix function search_path (security hardening)
ALTER FUNCTION auth_role() SET search_path = public, pg_temp;
ALTER FUNCTION auth_tenant_id() SET search_path = public, pg_temp;
ALTER FUNCTION auth_core_user_id() SET search_path = public, pg_temp;
ALTER FUNCTION sys_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION sys_audit_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION attn_detect_overtime() SET search_path = public, pg_temp;
