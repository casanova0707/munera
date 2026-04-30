# ログインコンポーネント 取扱説明書

## はじめに

このテンプレートは、Next.js アプリに認証機能（Google ログイン・メール/パスワード認証）をすぐに導入できるコンポーネント群です。

### 鉄則：認証が先、アプリは後

```
✅ 正しい順番
  1. このテンプレートからプロジェクト作成
  2. Supabase・Google 設定
  3. ログインが動くことを確認
  4. その上にアプリ機能を追加

❌ 失敗する順番
  1. アプリを先に作る
  2. 最後にログイン機能を追加しようとする
  3. 既存コードと衝突して作り直し
```

---

## Step 1: テンプレートからプロジェクト作成

### 方法A: 新規プロジェクトの場合（推奨）

```bash
npx create-next-app@latest my-app --example https://github.com/casanova0707/login-app
cd my-app
npm install
```

### 方法B: 既存プロジェクトに追加する場合

GitHub から以下のファイル/フォルダをコピー:

```
コピーするもの:
├── src/components/auth/          ← 認証コンポーネント一式
├── src/utils/supabase/           ← Supabase クライアント
├── src/middleware.ts             ← ルート保護
├── src/app/auth/                 ← コールバック・Server Actions
├── src/app/signup/               ← 新規登録ページ
├── src/app/forgot-password/      ← パスワードリセット要求ページ
└── src/app/reset-password/       ← 新パスワード設定ページ
```

パッケージを追加:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## Step 2: Supabase プロジェクト作成（5分）

1. https://supabase.com にログイン
2. 「New Project」→ プロジェクト名を入力 → Region: `Tokyo` → 作成
3. 作成完了後、**Settings > API** から以下をメモ:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: `eyJ...`

---

## Step 3: Google OAuth 設定（10分）

### 3-1: Google Cloud Console

1. https://console.cloud.google.com/ にアクセス
2. プロジェクトを作成（または既存を選択）
3. **APIとサービス > OAuth同意画面** を設定:
   - User Type: 外部
   - アプリ名: アプリ名を入力
   - メール: 自分のメール
4. **対象 > テストユーザー** に自分の Gmail を追加
5. **APIとサービス > 認証情報 > + 認証情報を作成 > OAuth クライアント ID**:
   - 種類: ウェブ アプリケーション
   - 承認済み JavaScript 生成元: `http://localhost:3000`
   - リダイレクト URI: `https://xxxx.supabase.co/auth/v1/callback`
     （↑ Supabase Dashboard の Authentication > Providers > Google に表示される Callback URL）
6. **Client ID** と **Client Secret** をメモ

### 3-2: Supabase に Google Provider を追加

1. Supabase Dashboard > **Authentication > Providers > Google** を ON
2. Client ID / Client Secret を入力 → Save

### 3-3: Supabase URL 設定

1. **Authentication > URL Configuration**
2. Site URL: `http://localhost:3000`
3. Redirect URLs に追加:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/confirm`

---

## Step 4: 環境変数を設定（1分）

プロジェクトのルートに `.env.local` を作成:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（Step 2 でメモした anon key）
```

---

## Step 5: profiles テーブル作成（2分）

Supabase Dashboard > **SQL Editor** で以下を実行:

```sql
-- ユーザー情報テーブル
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- セキュリティ設定
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 新規登録時に自動でプロフィール作成
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## Step 6: 動作確認（3分）

```bash
npm run dev
```

http://localhost:3000 を開いて以下を確認:

| # | テスト項目 | 確認方法 |
|---|---|---|
| 1 | ログイン画面表示 | `/` にアクセス |
| 2 | Google ログイン | 「Google でログイン」ボタン → ダッシュボード表示 |
| 3 | ログアウト | ダッシュボードの「ログアウト」→ ログイン画面に戻る |
| 4 | 新規登録 | `/signup` でメール登録 → 確認メール受信 |
| 5 | メールログイン | 確認メールのリンクをクリック後、メール/パスワードでログイン |
| 6 | ルート保護 | ログアウト状態で `/dashboard` にアクセス → ログイン画面にリダイレクト |

**全て OK ならログイン機能は完成。ここからアプリ開発を始めてください。**

---

## Step 7: アプリ機能の追加（ここからが本番）

ログインが動くことを確認したら、アプリの機能を追加していきます。

### ページの追加方法

`src/app/` にフォルダを作るだけ。保護したいページは `middleware.ts` に追加:

```typescript
// middleware.ts のこの部分を編集
if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
```

↓ 保護したいパスを追加

```typescript
if (
  !user &&
  (request.nextUrl.pathname.startsWith("/dashboard") ||
   request.nextUrl.pathname.startsWith("/settings") ||
   request.nextUrl.pathname.startsWith("/admin"))
) {
```

### ユーザー情報の取得方法

**Server Component（ページ等）の場合:**
```typescript
import { createClient } from "@/utils/supabase/server";

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // profiles テーブルからも取得可能
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
}
```

**Client Component（ボタン等）の場合:**
```typescript
"use client";
import { createClient } from "@/utils/supabase/client";

function MyComponent() {
  const supabase = createClient();
  // supabase.auth.getUser() や supabase.from("テーブル名") が使える
}
```

### profiles テーブルにカラムを追加する場合

アプリに必要なユーザー情報（電話番号、役職など）を追加するには:

```sql
-- Supabase SQL Editor で実行
alter table public.profiles add column phone text;
alter table public.profiles add column role text default 'user';
```

---

## Step 8: Vercel デプロイ（5分）

```bash
# GitHub リポジトリ作成 & push
gh repo create my-app --public --source=. --remote=origin --push

# Vercel にデプロイ
npx vercel --prod --yes
```

### デプロイ後に必ずやること:

1. **Vercel に環境変数を追加:**
   ```bash
   npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
   npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   ```

2. **Supabase > Authentication > URL Configuration > Redirect URLs に追加:**
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/auth/confirm`

3. **Google Cloud Console > 認証情報 > OAuth クライアント > 承認済みの JavaScript 生成元に追加:**
   - `https://your-app.vercel.app`

4. **再デプロイ:**
   ```bash
   npx vercel --prod --yes
   ```

---

## コンポーネント一覧

| コンポーネント | パス | 説明 | 使い方 |
|---|---|---|---|
| `LoginForm` | `components/auth/login-form.tsx` | ログインフォーム（メール + Google） | `<LoginForm />` |
| `SignupForm` | `components/auth/signup-form.tsx` | 新規登録フォーム | `<SignupForm />` |
| `ForgotPasswordForm` | `components/auth/forgot-password-form.tsx` | パスワードリセット要求 | `<ForgotPasswordForm />` |
| `ResetPasswordForm` | `components/auth/reset-password-form.tsx` | 新パスワード設定 | `<ResetPasswordForm />` |
| `GoogleLoginButton` | `components/auth/google-login-button.tsx` | Google ログインボタン単体 | `<GoogleLoginButton />` |
| `LogoutButton` | `components/auth/logout-button.tsx` | ログアウトボタン | `<LogoutButton />` |
| `AuthCard` | `components/auth/auth-card.tsx` | 共通カードUI | `<AuthCard title="タイトル">...</AuthCard>` |

---

## よくある失敗と対処

| 失敗 | 原因 | 対処 |
|---|---|---|
| Google ログイン後にエラー | Supabase の Redirect URLs 設定漏れ | `http://localhost:3000/auth/callback` が追加されているか確認 |
| 「このアプリはまだ確認されていません」 | Google テストユーザー未追加 | Google Cloud Console > 対象 > テストユーザーに Gmail 追加 |
| メールが届かない | Supabase 無料枠のレート制限（1時間4通） | 時間を置いて再試行 |
| Vercel で動かない | 環境変数未設定 or Redirect URLs に本番URL未追加 | 上記 Step 8 を確認 |
| アプリに認証を後付けして失敗 | ルーティングや状態管理が衝突 | **このテンプレートから始めてください** |

---

## チェックリスト（新しいアプリを作るとき）

- [ ] テンプレートからプロジェクト作成
- [ ] Supabase 新規プロジェクト作成
- [ ] Google OAuth 設定（Client ID / Secret 取得）
- [ ] Supabase に Google Provider 追加
- [ ] Supabase Redirect URLs 設定
- [ ] `.env.local` 作成
- [ ] profiles テーブル + トリガー作成
- [ ] `npm run dev` で動作確認
- [ ] **ログインが動くことを確認してからアプリ開発開始**
- [ ] アプリ完成後に Vercel デプロイ
- [ ] 本番 URL を Supabase / Google に追加
