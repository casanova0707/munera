
-- ========================================
-- 00001_extensions_enums.sql
-- ========================================
-- ============================================================
-- Munera Database Schema v1.0
-- Extensions and Enums
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums
CREATE TYPE user_role AS ENUM ('staff', 'sv', 'admin');
CREATE TYPE auth_method AS ENUM ('line', 'email');
CREATE TYPE attendance_type AS ENUM ('clock_in', 'clock_out', 'break_start', 'break_end');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'on_hold');
CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'on_hold', 'paid');
CREATE TYPE overtime_status AS ENUM ('pre_detected', 'acknowledged', 'approved', 'rejected');
CREATE TYPE shift_type AS ENUM ('day', 'night', 'flex', 'custom');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ========================================
-- 00002_core_tables.sql
-- ========================================
-- ============================================================
-- Core Tables (共通管理マスタ)
-- ============================================================

-- core_tenants: 組織・契約情報（マルチテナント対応）
CREATE TABLE core_tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  name_kana     TEXT,
  postal_code   VARCHAR(8),
  address       TEXT,
  phone         VARCHAR(20),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- core_users: ユーザー基本情報（LINE ID含む）
CREATE TABLE core_users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_auth_id  UUID UNIQUE NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  employee_code     VARCHAR(20) UNIQUE,
  role              user_role NOT NULL DEFAULT 'staff',
  auth_method       auth_method NOT NULL DEFAULT 'line',
  full_name         TEXT NOT NULL,
  full_name_kana    TEXT,
  email             TEXT,
  phone             VARCHAR(20),
  line_user_id      TEXT UNIQUE,
  avatar_url        TEXT,
  department        TEXT,
  position          TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  hired_at          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_tenant ON core_users(tenant_id);
CREATE INDEX idx_user_auth ON core_users(supabase_auth_id);
CREATE INDEX idx_user_line ON core_users(line_user_id);
CREATE INDEX idx_user_role ON core_users(role);

-- core_workplaces: 拠点・現場情報（GPS座標、住所マスタ）
CREATE TABLE core_workplaces (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  radius_meters   INTEGER NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workplace_tenant ON core_workplaces(tenant_id);

-- ========================================
-- 00003_attn_tables.sql
-- ========================================
-- ============================================================
-- Attendance Tables (勤怠・シフト)
-- ============================================================

-- attn_shifts: 勤務予定（時間、場所、役割）
CREATE TABLE attn_shifts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  shift_type      shift_type NOT NULL DEFAULT 'day',
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_minutes   INTEGER NOT NULL DEFAULT 60,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- attn_user_shifts: ユーザーとシフトの紐付け
CREATE TABLE attn_user_shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
  shift_id    UUID NOT NULL REFERENCES attn_shifts(id),
  start_date  DATE NOT NULL,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_shifts ON attn_user_shifts(user_id, start_date);

-- attn_clocks: 打刻実績（生データ、GPS、住所逆引き結果）
CREATE TABLE attn_clocks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES core_users(id),
  record_type       attendance_type NOT NULL,
  punched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  address           TEXT,
  workplace_id      UUID REFERENCES core_workplaces(id),
  is_offsite        BOOLEAN NOT NULL DEFAULT false,
  offsite_reason    TEXT,
  device_info       JSONB,
  photo_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clock_user_date ON attn_clocks(user_id, punched_at DESC);

-- attn_daily_summary: 日次集計
CREATE TABLE attn_daily_summary (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES core_users(id),
  work_date         DATE NOT NULL,
  shift_id          UUID REFERENCES attn_shifts(id),
  first_clock_in    TIMESTAMPTZ,
  last_clock_out    TIMESTAMPTZ,
  total_work_min    INTEGER,
  total_break_min   INTEGER,
  overtime_min      INTEGER DEFAULT 0,
  is_late           BOOLEAN DEFAULT false,
  is_early_leave    BOOLEAN DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, work_date)
);

-- attn_approvals: 承認履歴（誰がいつ、どのデータを承認/保留したか）
CREATE TABLE attn_approvals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type     TEXT NOT NULL,
  target_id       UUID NOT NULL,
  approver_id     UUID NOT NULL REFERENCES core_users(id),
  action          approval_status NOT NULL,
  comment         TEXT,
  acted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attn_approval_target ON attn_approvals(target_type, target_id);

-- attn_overtime: 前残業自動検知・承認
CREATE TABLE attn_overtime (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES core_users(id),
  work_date         DATE NOT NULL,
  detected_minutes  INTEGER NOT NULL,
  status            overtime_status NOT NULL DEFAULT 'pre_detected',
  approved_by       UUID REFERENCES core_users(id),
  approved_at       TIMESTAMPTZ,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- 00004_exp_tables.sql
-- ========================================
-- ============================================================
-- Expense Tables (経費・精算)
-- ============================================================

-- exp_categories: 経費カテゴリ
CREATE TABLE exp_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES core_tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            VARCHAR(10),
  max_amount      NUMERIC(12,2),
  requires_receipt BOOLEAN NOT NULL DEFAULT true,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- exp_applications: 交通費・経費申請（ステータス管理）
CREATE TABLE exp_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES core_users(id),
  category_id     UUID NOT NULL REFERENCES exp_categories(id),
  expense_date    DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'JPY',
  description     TEXT NOT NULL,
  status          expense_status NOT NULL DEFAULT 'draft',
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exp_user_date ON exp_applications(user_id, expense_date DESC);
CREATE INDEX idx_exp_status ON exp_applications(status);

-- exp_receipt_images: 領収書スキャンデータ（OCR結果含む）
CREATE TABLE exp_receipt_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES exp_applications(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  ocr_result      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipt_app ON exp_receipt_images(application_id);

-- exp_approvals: 経費承認ログ
CREATE TABLE exp_approvals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES exp_applications(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES core_users(id),
  action          approval_status NOT NULL,
  comment         TEXT,
  acted_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exp_approval_app ON exp_approvals(application_id);

-- ========================================
-- 00005_sys_tables.sql
-- ========================================
-- ============================================================
-- System Tables (システム管理)
-- ============================================================

-- sys_table_metadata: データカタログ
CREATE TABLE sys_table_metadata (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schema_name     TEXT NOT NULL DEFAULT 'public',
  table_name      TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  display_name_ja TEXT,
  description     TEXT,
  module          TEXT NOT NULL,
  is_master       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schema_name, table_name)
);

-- sys_settings: アプリケーション設定
CREATE TABLE sys_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES core_tenants(id),
  key             TEXT NOT NULL,
  value           JSONB NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);

-- sys_audit_logs: 監査ログ
CREATE TABLE sys_audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  action          audit_action NOT NULL,
  actor_id        UUID REFERENCES core_users(id),
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table ON sys_audit_logs(table_name, record_id);
CREATE INDEX idx_audit_actor ON sys_audit_logs(actor_id);
CREATE INDEX idx_audit_time ON sys_audit_logs(created_at DESC);

-- sys_line_notifications: LINE通知キュー
CREATE TABLE sys_line_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID NOT NULL REFERENCES core_users(id),
  message_type    TEXT NOT NULL,
  payload         JSONB NOT NULL,
  sent_at         TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- 00006_functions_triggers.sql
-- ========================================
-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION sys_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to mutable tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'core_tenants','core_users','core_workplaces',
    'attn_shifts','attn_daily_summary','attn_overtime',
    'exp_applications',
    'sys_table_metadata','sys_settings'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION sys_set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Generic audit log trigger
CREATE OR REPLACE FUNCTION sys_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sys_audit_logs(table_name, record_id, action, actor_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP::audit_action,
    NULLIF(current_setting('app.current_user_id', true), '')::UUID,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Overtime pre-detection trigger
CREATE OR REPLACE FUNCTION attn_detect_overtime()
RETURNS TRIGGER AS $$
DECLARE
  shift_minutes INTEGER;
BEGIN
  SELECT EXTRACT(EPOCH FROM (s.end_time - s.start_time))/60 - s.break_minutes
    INTO shift_minutes
    FROM attn_shifts s WHERE s.id = NEW.shift_id;

  IF NEW.total_work_min > COALESCE(shift_minutes, 480) THEN
    INSERT INTO attn_overtime(user_id, work_date, detected_minutes, status)
    VALUES (
      NEW.user_id,
      NEW.work_date,
      NEW.total_work_min - COALESCE(shift_minutes, 480),
      'pre_detected'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_overtime_detect
  AFTER INSERT OR UPDATE ON attn_daily_summary
  FOR EACH ROW EXECUTE FUNCTION attn_detect_overtime();

-- Seed sys_table_metadata with initial catalog
INSERT INTO sys_table_metadata (table_name, display_name, display_name_ja, description, module, is_master) VALUES
  ('core_tenants', 'Tenants', '組織', '組織・契約情報（マルチテナント）', 'core', true),
  ('core_users', 'Users', 'ユーザー', 'ユーザー基本情報', 'core', true),
  ('core_workplaces', 'Workplaces', '拠点・現場', '拠点情報（GPS座標、住所）', 'core', true),
  ('attn_shifts', 'Shifts', 'シフト', '勤務予定テンプレート', 'attn', true),
  ('attn_user_shifts', 'User Shifts', 'ユーザーシフト', 'ユーザーとシフトの紐付け', 'attn', false),
  ('attn_clocks', 'Clock Records', '打刻実績', '打刻生データ（GPS、住所逆引き）', 'attn', false),
  ('attn_daily_summary', 'Daily Summary', '日次集計', '日次の勤務時間集計', 'attn', false),
  ('attn_approvals', 'Attendance Approvals', '勤怠承認', '承認履歴', 'attn', false),
  ('attn_overtime', 'Overtime', '残業', '残業検知・承認', 'attn', false),
  ('exp_categories', 'Expense Categories', '経費カテゴリ', '経費カテゴリマスタ', 'exp', true),
  ('exp_applications', 'Expense Applications', '経費申請', '交通費・経費申請', 'exp', false),
  ('exp_receipt_images', 'Receipt Images', '領収書画像', '領収書スキャンデータ', 'exp', false),
  ('exp_approvals', 'Expense Approvals', '経費承認', '経費承認ログ', 'exp', false),
  ('sys_table_metadata', 'Table Metadata', 'テーブルカタログ', 'データカタログ', 'sys', true),
  ('sys_settings', 'Settings', '設定', 'アプリケーション設定', 'sys', true),
  ('sys_audit_logs', 'Audit Logs', '監査ログ', '操作履歴', 'sys', false),
  ('sys_line_notifications', 'LINE Notifications', 'LINE通知', 'LINE通知キュー', 'sys', false);

-- ========================================
-- 00007_rls_policies.sql
-- ========================================
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

-- ========================================
-- 00008_rls_remediation.sql
-- ========================================
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

-- ========================================
-- 00009_rls_admin_write.sql
-- ========================================
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

