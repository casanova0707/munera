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
