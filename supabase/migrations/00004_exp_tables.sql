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
