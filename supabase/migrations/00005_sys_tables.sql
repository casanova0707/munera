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
