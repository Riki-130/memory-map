# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Memory Map は、カップル（将来は友人カップルも）が思い出の場所・行ってみたい場所を共有地図で管理するスマートフォン優先のPWA。仕様は [docs/requirements.md](docs/requirements.md) に従う。ユーザーとのやり取りは日本語。

## コマンド

- `npm run dev`：開発サーバー（http://localhost:5173/memory-map/）を起動する。`.env.local` に `VITE_GOOGLE_MAPS_API_KEY` が必要（`.env.example` 参照）。
- `npm run build`：GitHub Pages 用に、`/memory-map/` を基準パスとして `dist/` に出力する。
- `npm run build:preview`：Firebase Hosting のプレビューチャンネル用に、ルート `/` を基準パスとして出力する。
- `scripts/make-icons.sh [画像]`：正方形の画像から、PWA とホーム画面用のアイコンを `public/icons/` に生成する（macOS の `sips` を使用）。
- lint とテストの仕組みはまだ無い。
- この環境では `~/.npm` に root 所有のファイルがあり、npm や npx が失敗することがある。その場合は `npm_config_cache=<scratchpad>/npm-cache` を付けて実行する。

## デプロイ（いずれもユーザーの確認を得てから実行する）

- **フロントエンド**：main に push すると、`.github/workflows/deploy.yml` がビルドして GitHub Pages に公開する。ビルドに必要な `VITE_GOOGLE_MAPS_API_KEY` と `VITE_GOOGLE_MAP_ID` は、リポジトリの Variables に登録してある。
- **Function・ルール**：`npx firebase-tools deploy --only functions`、`--only firestore:rules,storage` で反映する。
- **実機での確認**：`npm run build:preview` のあと `npx firebase-tools hosting:channel:deploy preview` を実行する。プレビューのドメインは、Auth の承認済みドメインと Maps キーのリファラーに登録が必要。

## アーキテクチャ

- `src/App.jsx` はログイン状態だけを判定する。ログイン後の画面（`SignedIn.jsx` 以下）は遅延読み込みにしている。Firestore、Storage、Google Maps を `src/firebase/db.js` 以降に分け、ログイン画面を軽く保つため。`src/firebase/app.js` には認証の処理だけを置く。
- `features/membership/useMembership.js` が、ログイン後に表示する画面を決める：
  - 招待リンク（`?map=&invite=`）から来た、まだメンバーでない人 → 参加申請画面
  - 所属している地図がない人 → 地図を自動で作る。ただし、サーバーの結果で「地図がない」と確定した場合に限る。オフラインのキャッシュだけで判断すると、地図が重複してできるため。
  - それ以外 → 地図画面
- データ構造と権限（詳細は `src/firebase/maps.js`、`pins.js`、`firestore.rules`、`storage.rules` に書いてある）：
  - `maps/{mapId}`：`memberIds` と `members` を持つ。これらを変更できるのはホストだけ。
  - `pins`：メンバー全員が読み書きできる。
  - `invites/{token}`：招待トークン。
  - `joinRequests/{uid}`：参加申請。作成するには有効なトークンが必要。
  - 写真：`maps/{mapId}/pins/{pinId}/` に、本体と小さい画像（`_thumb.jpg`）の2つを保存する。アップロード前にブラウザで縮小する。
  - 写真のダウンロード URL は Firestore に保存しない。表示するたびに `getDownloadURL` で取得する。
- 地図は `@vis.gl/react-google-maps` を使う。
  - ピンは Advanced Marker で表示するため、Map ID が必要（開発時は `DEMO_MAP_ID`）。
  - 長押しは `MapCanvas.jsx` で、`mousedown` から一定時間たったかで判定する。PC の右クリック（`contextmenu`）でも追加できる。
  - 新しいピンの名前と住所は、次のどちらかで自動入力する：Geocoder で住所を逆引きする／施設をタップしたときは Place の詳細を取得する。
- 場所検索は Cloud Function `searchPlaces` を経由する（`functions/index.js`）。
  - IDトークンの検証と、許可した送信元かどうかの確認を行う。
  - 返す内容に `types` を含めている。`src/features/pins/categories.js` が、これを使ってカテゴリと絵文字を自動で決める。

## 秘密情報と API キー

- **Places（サーバー用）**：Secret `PLACES_API_KEY` に入れる。Cloud Console 上の名前は `places-server-key`。値をリポジトリに書かない。
- **Maps（ブラウザ用）**：`VITE_GOOGLE_MAPS_API_KEY`。ローカルでは `.env.local`（Git の管理外）、公開時は GitHub Variables から渡す。使えるサイトを制限したキーでも、コミットはしない。
- **Firebase のブラウザ用キー**：`src/firebase/config.js` にある。公開されても問題ない種類のキーで、Console で使えるサイトと API を制限してある。
- **Firebase 関連のキーやルールに関わる API を新しく使うとき**：Browser key の「APIの制限」にその API を追加する必要がある。

## UI の決まり

- テーマカラーは `src/styles/app.css` の `:root` にまとめてある：Deep Shadow `#0f0b08`、Ocean Teal `#197379`、Mint Blue `#78bab9`、`#b4d7d9`、Soft Butter `#f1ebcb`。
- パネル類は `.glass`（Liquid Glass 調）で統一する。
- ピンの色は種別で分ける：思い出はティール、行ってみたいはバター色。
- ログイン画面の画像は 851×1847。ボタンは「Since 2026/04/01」の行とキャラクターの間（`top: 31%`）に置く。
- iPhone Safari とホーム画面アプリが主な利用環境。画面上下の安全領域（`env(safe-area-inset-*)`）を考慮する。
