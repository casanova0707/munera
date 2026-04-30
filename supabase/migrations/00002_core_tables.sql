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
