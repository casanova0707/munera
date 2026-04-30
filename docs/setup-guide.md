# セットアップガイド

## 概要
Next.js + Supabase を使った認証テンプレート。
Google OAuth + メール/パスワード（ログイン・新規登録・パスワードリセット）をサポート。

---

## 要件定義

### 機能要件
1. **Google OAuth ログイン** - Google アカウントでワンクリックログイン
2. **メール/パスワードログイン** - メールアドレスとパスワードでログイン
3. **新規登録** - ユーザー名・メール・パスワードでアカウント作成（確認メール送信）
4. **パスワードリセット** - メールアドレスにリセットリンクを送信 → 新パスワード設定
5. **ルート保護** - 未認証ユーザーをログインページにリダイレクト
6. **ダッシュボード** - ログイン後にユーザー情報を表示

### 非機能要件
- **再利用性**: `components/auth/` + `utils/supabase/` + `middleware.ts` + `app/auth/` をコピーして他プロジェクトで使用可能
- **セキュリティ**: Server Actions でサーバー側バリデーション、getUser() による認証確認
- **デプロイ**: Vercel に対応

### 技術スタック
- **フロントエンド**: Next.js (App Router, TypeScript, Tailwind CSS)
- **認証**: Supabase Auth
- **デプロイ**: Vercel

---

## Phase 0: 外部サービス設定（手動作業）

### Step 1: Supabase プロジェクト作成
1. https://supabase.com にアクセスし、アカウント作成/ログイン
2. 「New Project」をクリック
3. 設定:
   - **Organization**: 既存のものを選択、または新規作成
   - **Project name**: `login-app`（任意）
   - **Database Password**: 強力なパスワードを設定
   - **Region**: `Northeast Asia (Tokyo)`
4. 「Create new project」をクリック（約2分待つ）
5. **Settings > API** に移動し、以下をメモ:
   - **Project URL** (例: `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public key** (例: `eyJhbGciOiJIUzI1NiIs...`)

### Step 2: Google Cloud Console で OAuth 設定
1. https://console.cloud.google.com/ にアクセス
2. 新しいプロジェクトを作成
3. **APIとサービス > OAuth同意画面** を設定:
   - User Type: 「外部」
   - アプリ名: 任意
   - ユーザーサポートメール: 自分のメール
   - スコープ: `email`, `profile` を追加
   - テストユーザーに自分の Gmail を追加
4. **APIとサービス > 認証情報 > + 認証情報を作成 > OAuth クライアント ID**:
   - アプリケーションの種類: 「ウェブ アプリケーション」
   - 承認済みの JavaScript 生成元: `http://localhost:3000`
   - 承認済みのリダイレクト URI: Supabase の Callback URL（次のステップで確認）
5. **Client ID** と **Client Secret** をメモ

### Step 3: Supabase に Google Provider を設定
1. Supabase Dashboard > **Authentication > Providers > Google**
2. トグルを ON
3. Client ID / Client Secret を入力
4. 表示されている **Callback URL** をコピーして、Google Cloud Console のリダイレクト URI に設定
5. Save

### Step 4: Supabase URL 設定
1. **Authentication > URL Configuration**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs** に追加:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/confirm`

---

## Phase 1: ローカル環境構築

### `.env.local` を設定
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 起動
```bash
npm install
npm run dev
```

http://localhost:3000 にアクセス

---

## ファイル構成

```
src/
├── app/
│   ├── layout.tsx                      # ルートレイアウト
│   ├── page.tsx                        # トップ（ログイン画面）
│   ├── globals.css                     # グローバルスタイル
│   ├── auth/
│   │   ├── callback/route.ts           # OAuth コールバック
│   │   ├── confirm/route.ts            # メール確認・パスワードリセットコールバック
│   │   └── actions.ts                  # Server Actions（login, signup, resetPassword, updatePassword）
│   ├── signup/page.tsx                 # 新規登録ページ
│   ├── forgot-password/page.tsx        # パスワードリセット要求ページ
│   ├── reset-password/page.tsx         # 新パスワード設定ページ
│   └── dashboard/page.tsx              # 保護されたページ
├── components/
│   └── auth/                           # ★ 再利用可能コンポーネント
│       ├── auth-card.tsx               # 共通カードUI
│       ├── login-form.tsx              # ログインフォーム
│       ├── signup-form.tsx             # 新規登録フォーム
│       ├── forgot-password-form.tsx    # パスワードリセット要求
│       ├── reset-password-form.tsx     # 新パスワード入力
│       ├── google-login-button.tsx     # Google ログインボタン
│       └── logout-button.tsx           # ログアウトボタン
├── middleware.ts                       # トークンリフレッシュ + ルート保護
└── utils/
    └── supabase/
        ├── client.ts                   # ブラウザ用 Supabase クライアント
        └── server.ts                   # サーバー用 Supabase クライアント
```

---

## 他プロジェクトへの再利用方法

1. 以下のフォルダ/ファイルをコピー:
   - `src/components/auth/`
   - `src/utils/supabase/`
   - `src/middleware.ts`
   - `src/app/auth/`
2. npm パッケージをインストール:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```
3. `.env.local` に Supabase の URL と anon key を設定
4. 必要に応じてページ（`signup/`, `forgot-password/`, `reset-password/`）もコピー

---

## Vercel デプロイ

1. GitHub にリポジトリを push
2. https://vercel.com で「New Project」→ リポジトリを選択
3. Environment Variables に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を追加
4. Deploy
5. **デプロイ後に必ず以下を更新:**
   - Supabase > Authentication > URL Configuration:
     - Site URL → 本番URL
     - Redirect URLs に `https://your-app.vercel.app/auth/callback` と `/auth/confirm` を追加
   - Google Cloud Console > 認証情報:
     - 承認済み JavaScript 生成元に本番URL を追加

---

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---|---|---|
| `/auth/callback` | GET | OAuth コールバック（Google ログイン後） |
| `/auth/confirm` | GET | メール確認 / パスワードリセット確認 |

## Server Actions

| アクション | 説明 |
|---|---|
| `login(formData)` | メール/パスワードでログイン |
| `signup(formData)` | 新規登録（確認メール送信） |
| `resetPassword(formData)` | パスワードリセットメール送信 |
| `updatePassword(formData)` | 新パスワード設定 |

---

## トラブルシューティング

| 問題 | 解決策 |
|---|---|
| Google ログイン後に `auth_failed` | Supabase の Redirect URLs に `http://localhost:3000/auth/callback` があるか確認 |
| 「このアプリはまだ確認されていません」 | Google Cloud Console でテストユーザーに自分の Gmail を追加 |
| ログイン後にダッシュボードに飛ばない | `/auth/callback/route.ts` のリダイレクト先を確認 |
| Vercel デプロイ後にログインできない | Site URL と Redirect URLs を本番URL に更新 |
| パスワードリセットメールが届かない | Supabase の SMTP 設定を確認（無料枠は1時間に4通まで） |
| `email rate limit exceeded` エラー | Supabase 無料枠のメール送信上限（1時間4通）。時間を置いて再試行 |

---

## 動作確認結果（2026-04-14）

| 機能 | 結果 |
|---|---|
| Google OAuth ログイン | OK |
| メール/パスワード新規登録 | OK |
| 確認メール → アカウント有効化 | OK |
| メール/パスワードログイン | OK |
| パスワードリセット | OK（レート制限で一時的に送信不可だったが機能自体は正常） |
| ルート保護（未認証リダイレクト） | OK |
| ログアウト | OK |
| Vercel 本番デプロイ | OK |
| 本番環境 Google ログイン | OK |

## デプロイ情報

| 項目 | 値 |
|---|---|
| GitHub | https://github.com/casanova0707/login-app |
| 本番 URL | https://login-gules-three.vercel.app |
| Supabase Project | https://ishpnyxxnvzazqxusxzg.supabase.co |
