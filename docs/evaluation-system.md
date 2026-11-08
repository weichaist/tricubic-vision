# Evaluation system / 評価システム

## English summary

Staff rate every result Gemini produces, so you can see how often the model is
right. Each **alert** (a rule violation) and each **applause** (good behavior,
shown as "ブラボー" in the portal) can be rated by each signed-in user with one of:

| Button | Value      | Meaning (UI label) |
| ------ | ---------- | ------------------ |
| ⭕️     | `positive` | 良い (good)        |
| 🔼     | `neutral`  | 普通 (neutral)     |
| ❌     | `negative` | 悪い (bad)         |

How it works:

- Ratings live in the `evaluations` table
  (`supabase/migrations/20251201000000_evaluations.sql`). A row points at exactly
  one alert (`alert_uid`) or one applause (`applause_uid`); a check constraint
  enforces that. Deleting the alert/applause deletes its ratings.
- A user can rate an item once; clicking another button updates the same row
  (partial unique indexes on `(alert_uid, evaluator_user_uid)` and
  `(applause_uid, evaluator_user_uid)`).
- Row Level Security: users see ratings of their own company, insert ratings
  only as themselves for their own company, and update only their own ratings.
  Ratings cannot be deleted from the portal. The rated item's `company_uid` must
  be set, so alerts written without a company cannot be rated.
- UI: `apps/admin/components/ui/evaluation-buttons-v2.tsx` exports
  `EvaluationButtons` (the three buttons, create/update through the user's
  Supabase session), `EvaluationCounts` and `useEvaluationCounts` (counts per
  value). They appear in the alert detail panel
  (`components/dashboard/alert-details-viewer.tsx`) and the applause detail sheet
  (`components/dashboard/location-applause-table.tsx`).
- The view `evaluations_with_item_type` adds `evaluated_item_type`
  (`alert` / `applause`) and `evaluated_item_uid` for reporting; it runs with the
  caller's permissions (`security_invoker`).

Not built yet: the `notes` column is not used by the UI, and there is no report
or export of ratings.

The original Japanese guide follows, updated to match the final schema.

---

## 概要 (Overview)

このドキュメントでは、アラートとブラボー（applause）に対する評価システムの実装について説明します。

ユーザーは以下の3つの評価でアラートやブラボーを評価できます：
- ⭕️ 良い (positive)
- 🔼 普通 (neutral)
- ❌ 悪い (negative)

## データベーススキーマ (Database Schema)

### 評価テーブル (evaluations table)

定義は `supabase/migrations/20251201000000_evaluations.sql` にあります（抜粋）：

```sql
CREATE TABLE evaluations (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- どちらか一方のみ設定
  alert_uid UUID REFERENCES alerts(uid) ON DELETE CASCADE,
  applause_uid UUID REFERENCES applause(uid) ON DELETE CASCADE,
  evaluation_value TEXT NOT NULL CHECK (evaluation_value IN ('positive', 'neutral', 'negative')),
  evaluator_user_uid UUID REFERENCES users(uid),
  notes TEXT,
  location_uid UUID REFERENCES locations(uid),
  company_uid UUID REFERENCES companies(uid),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT exactly_one_item_type CHECK (
    (alert_uid IS NOT NULL AND applause_uid IS NULL) OR
    (alert_uid IS NULL AND applause_uid IS NOT NULL)
  )
);
```

### 主要なフィールド説明

- `alert_uid`: 評価対象のアラートのUID（アラートを評価する場合）
- `applause_uid`: 評価対象のブラボーのUID（ブラボーを評価する場合）
- `evaluation_value`: 評価値 ('positive', 'neutral', 'negative')
- `evaluator_user_uid`: 評価を行ったユーザーのUID
- `notes`: 評価に関するメモ（将来の拡張用）
- `location_uid`: 拠点UID（レポート生成などに使用）
- `company_uid`: 会社UID（アクセス制御に使用）

### インデックスと制約

- 同一ユーザーが同一アイテムに対して複数回評価することを防ぐユニーク制約（アラート用・ブラボー用の部分インデックス）
- `alert_uid` と `applause_uid` のどちらか一方だけを設定させるチェック制約
- パフォーマンス向上のためのインデックス
- 会社レベルでのRow Level Security（RLS）
- 評価対象の種類を返すビュー `evaluations_with_item_type`

## 実装済みのコンポーネント

### 1. 評価ボタンコンポーネント (`apps/admin/components/ui/evaluation-buttons-v2.tsx`)

**主要機能:**
- 3つの評価ボタン（⭕️🔼❌）の表示
- 現在のユーザーの評価状態の取得・表示
- 評価の作成・更新
- 評価数の集計・表示

**主要なエクスポート:**
- `EvaluationButtons`: 評価ボタンコンポーネント
- `EvaluationCounts`: 評価数表示コンポーネント
- `useEvaluationCounts`: 評価数取得カスタムフック

### 2. アラート詳細ビューアー (`apps/admin/components/dashboard/alert-details-viewer.tsx`)

- アラート詳細の下部に評価セクション（評価数と評価ボタン）を表示

### 3. ブラボーテーブル (`apps/admin/components/dashboard/location-applause-table.tsx`)

- ブラボーの詳細ポップアップ（Sheet）に評価セクションを表示

## セットアップ

```bash
# ローカル: マイグレーションとシードを適用
supabase db reset

# ホスト環境: リンク済みプロジェクトにマイグレーションを適用
supabase db push

# 型の再生成（スキーマを変更した場合）
supabase gen types typescript --local --schema public > apps/admin/database.types.ts
```

## テスト

1. 評価ボタンが正常に動作することを確認
2. 同一ユーザーが同一アイテムを再評価すると、既存の評価が更新されることを確認
3. 評価数の集計が正常に表示されることを確認
4. 異なる会社のユーザー間でのアクセス制御確認

## アーキテクチャの詳細

### セキュリティ

- Row Level Security (RLS) により、ユーザーは自社の評価のみ閲覧可能
- ユーザーは自分の評価のみ作成・更新可能
- 評価は削除不可（データの整合性保持）
- 評価対象に `company_uid` が設定されていない場合は評価できない

### データ整合性

- 同一ユーザー×同一アイテムのユニーク制約
- 評価値の制約（positive/neutral/negative）
- アラートかブラボーのどちらか一方を参照する制約
- 評価対象が削除されると評価も削除される（ON DELETE CASCADE）

### パフォーマンス

- 主要なクエリパターンに対するインデックス
- 評価数の効率的な集計クエリ
- React Queryによるクライアントサイドキャッシング

## 将来の拡張可能性

1. **評価理由の追加**: `notes`フィールドを活用
2. **評価の重み付け**: ユーザーの役職に応じた重み付け
3. **評価履歴**: 評価の変更履歴追跡
4. **評価レポート**: 評価データに基づく分析レポート
5. **評価通知**: 評価に関する通知機能

## トラブルシューティング

### よくある問題

1. **RLSエラー**: ユーザーが `users` テーブルに登録され、評価対象と同じ会社に所属していることを確認
2. **重複評価エラー**: ユニーク制約により同一ユーザーの重複評価は防止される（UIは既存の評価を更新する）

## API仕様

### 評価の作成

```typescript
POST /rest/v1/evaluations
{
  "alert_uid": "uuid",          // またはブラボーの場合は "applause_uid"
  "evaluation_value": "positive" | "neutral" | "negative",
  "evaluator_user_uid": "uuid",
  "location_uid": "uuid",
  "company_uid": "uuid"
}
```

### 評価の更新

```typescript
PATCH /rest/v1/evaluations?uid=eq.{uid}
{ "evaluation_value": "neutral" }
```

### 評価の取得

```typescript
GET /rest/v1/evaluations?alert_uid=eq.{uid}&evaluator_user_uid=eq.{user_uid}
```

### 評価数の集計

```typescript
GET /rest/v1/evaluations?select=evaluation_value&alert_uid=eq.{uid}
```
