-- ============================================================
-- Shift Assignments (日別シフト割当)
-- ============================================================

CREATE TABLE attn_shift_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
  shift_id    UUID REFERENCES attn_shifts(id) ON DELETE SET NULL,
  work_date   DATE NOT NULL,
  is_day_off  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, work_date)
);

CREATE INDEX idx_shift_assignments_tenant_date
  ON attn_shift_assignments(tenant_id, work_date);

-- RLS: staff read own, admin/sv full CRUD within tenant
ALTER TABLE attn_shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_staff_own" ON attn_shift_assignments
  FOR SELECT USING (user_id = auth_core_user_id());

CREATE POLICY "assignments_admin" ON attn_shift_assignments
  FOR ALL USING (
    auth_role() IN ('sv', 'admin')
    AND user_id IN (SELECT id FROM core_users WHERE tenant_id = auth_tenant_id())
  );
