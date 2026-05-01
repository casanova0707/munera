-- ============================================================
-- 00010: receipts ストレージバケット作成 + RLS ポリシー
-- ============================================================

-- バケット作成（存在しない場合のみ）
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- ポリシー: 認証済みユーザーがアップロード可能
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- ポリシー: 認証済みユーザーが閲覧可能
CREATE POLICY "Users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- ポリシー: アップロードしたファイルの更新
CREATE POLICY "Users can update receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- ポリシー: アップロードしたファイルの削除
CREATE POLICY "Users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
