# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Memory Map は、カップルや友人が思い出の場所・行ってみたい場所を地図で共有するスマートフォン優先のPWA。要件・設計・改善履歴は [docs/requirements.md](docs/requirements.md) にあり、仕様判断はこれに従う。ユーザーとのやり取りは日本語。

## 構成と実行

- フロントエンドはビルド工程なしの静的ファイル（HTML/CSS/素のJS）。npm パッケージ・バンドラ・lint・テストは無い。ルートの `node_modules/` は追跡対象外で、アプリからは使っていない。
- 公開先は GitHub Pages（`https://riki-130.github.io/memory-map/`）。push 後にそのまま配信されるため、push はユーザーの確認後に行う。
- ローカル確認は任意の静的サーバーで行う（例：`python3 -m http.server 8000`）。Googleログインは Firebase Auth の承認済みドメイン（localhost は既定で許可）でのみ動く。
- Cloud Function は `functions/` のみ（Node.js 22、firebase-functions v2）。デプロイは `npx firebase-tools deploy --only functions`。本番に影響するため、実行前に必ずユーザーへ確認する。

## アーキテクチャ

- 読み込み順は [index.html](index.html) の末尾が基準：Leaflet → `search-config.js` / `firebase-config.js`（`window.MEMORY_MAP_CONFIG` と `window.FIREBASE_CONFIG` を定義）→ `app.js`（通常スクリプト）→ `firebase-auth.js`（ES Module、gstatic CDN から Firebase SDK を読み込む）。
- `app.js` と `firebase-auth.js` は import でつながっていない。モジュールは遅延実行されるため、`app.js` が先に動く。両者は `window` のグローバル変数と DOM を介してやり取りする。新しく連携を足すときもこの方式に合わせる。
- 認証による画面制御は、`firebase-auth.js` が `body.authenticated` と `#auth-loading` の表示を切り替えるだけ。地図そのものは未ログインでも初期化される。
- 場所検索（`app.js` の submit ハンドラ）の流れ：
  1. Cloud Function `searchPlaces` が Google Places の Text Search を代理呼び出しし、候補を `#search-candidates` に表示する（結果は sessionStorage にキャッシュ）。
  2. 候補が無いときは、ブラウザから直接、国土地理院 → Photon → Nominatim の順に検索し、最初に見つかった1件を即ピンにする。
- ピンは localStorage にJSON配列で保存し、`savedPins` 配列と `markerById`（id → Leafletマーカー）を常に同期させる。保存方式は将来 Firestore へ移行する予定（要件 §7.2）。
- キャッシュ対策として、`index.html` の `app.js?v=...` と `firebase-auth.js?v=...` を手動で更新している。JS を変えたら両方の値を同じように上げる。

## 秘密情報

- Places APIキーは Functions の Secret `PLACES_API_KEY` だけで管理する。ブラウザ側のファイルやリポジトリには絶対に書かない。
- `firebase-config.js` の `apiKey` は公開前提のブラウザ用キー。安全性は Google Cloud Console でのキー制限と、サーバー側の認可で担保する。

## UI の決まり

- 幅640px以下をスマートフォン表示とする（`styles.css` の `@media (max-width: 640px)`）。
- ヘッダーは上から「タイトル＋メニュー → 検索欄 → キャラクター → 地図」の順に並べ、画面に収める。キャラクター画像は黒背景のみ透過済みで、タイトルに重なってよい。
- 細かな見た目の要件（青の「ピン検索」ボタン、背景なしの三本線メニューなど）は要件 §9 を参照。
