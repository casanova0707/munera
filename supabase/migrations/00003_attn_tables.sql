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
