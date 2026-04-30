-- Admin/SV write access for daily summaries and expense applications
-- Without these, summary upsert and expense approval silently fail via RLS

-- attn_daily_summary: admin/sv can INSERT and UPDATE for tenant users
CREATE POLICY "summary_admin_write" ON attn_daily_summary
  FOR INSERT WITH CHECK (
    auth_role() IN ('sv','admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

CREATE POLICY "summary_admin_update" ON attn_daily_summary
  FOR UPDATE USING (
    auth_role() IN ('sv','admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );

-- exp_applications: admin/sv can UPDATE status (approve/reject)
CREATE POLICY "exp_admin_update" ON exp_applications
  FOR UPDATE USING (
    auth_role() IN ('sv','admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );
