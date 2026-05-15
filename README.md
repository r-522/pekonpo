# ぺこたんのRPを追いかける

Apex Legends の RP 推移を可視化・分析する Angular + Vercel Serverless アプリです。

## 主な機能
- 時系列ラインチャート（RP推移）
- レコードテーブル表示（日時・RP・推定ランク）
- 期間切替（7日 / 30日 / 全期間）
- 統計カード（最新 / 最高 / 最低 / 平均 / 変動幅）
- 手動更新ボタン
- CSVエクスポート
- ダークモード切替
- レスポンシブ対応

## 技術構成
- Frontend: Angular 17 (Standalone)
- Chart: Chart.js + ng2-charts
- Backend: Vercel Serverless Function (`api/rp.ts`)
- DB: Supabase PostgREST (`player_rp` テーブル)

## セットアップ
```bash
npm install
cp .env.example .env
npm run build
```

## 必須環境変数
- `SUPABASE_URL`: Supabase プロジェクト URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service_role key（サーバーのみ）
- `CORS_ORIGIN`: 許可するオリジン
- `DASHBOARD_API_KEY`: 任意。設定した場合 `/api/rp` は `x-api-key` 必須

## ローカル開発
```bash
npm start
```

> Angular dev server では `/api/rp` の呼び出し先が必要です。Vercel Dev (`vercel dev`) か、必要に応じてプロキシ設定を追加してください。

## デプロイ（Vercel）
1. Vercel に Git 連携
2. Environment Variables に `.env.example` の値を設定
3. Build Command: `npm run build`
4. Output Directory: `dist/pekonpo/browser`
5. Deploy

## Supabase テーブル想定
`player_rp`
- `id` (PK)
- `rp` (numeric)
- `created_at` (timestamp)

## セキュリティ実装
- CORS 制御
- 任意 API キー認証 (`DASHBOARD_API_KEY`)
- IP 単位の簡易レート制限（60 req/min）
