# Kakeizu Studio

続柄と性別を選ぶだけで家族相関図を作成できる、React・PHP・SQLite製のWebアプリです。クライアントワークを基に、実データや固有のインフラ情報を含まないポートフォリオ版として再構成しています。

## 担当範囲と工夫

- ReactとTypeScriptによる画面設計・実装
- PHP APIとSQLiteスキーマの設計・実装
- 続柄からノードと関係線を生成するドメインロジック
- ドラッグ、リサイズ、表示設定、PNG出力を備えた編集体験
- CSRF・Origin検証、認証試行制限、セッション期限、利用者間のデータ分離
- フロントエンド、API、マイグレーション、配布物の自動テスト

## 主な機能

- ログインIDとパスワードによる管理者ログイン
- 利用者ごとに複数の相関図を保存
- 続柄、性別、基準ノードから人物と関係線を自動生成
- 配偶者、子、親、兄弟姉妹を選択中の人物から追加
- 複数配偶者、片親の子、義父母を含む多世代表示
- 続柄の接続規則、線種、線色のカスタマイズ
- 性別の名称、形、塗り色、文字色のカスタマイズ
- ノードごとの複数行メモ、フォントサイズ、表示サイズの調整
- ドラッグ＆ドロップによる配置変更とSQLiteへの保存
- 相関図全体の高解像度PNG出力

## 技術構成

- Frontend: React 19 / TypeScript / Vite / React Flow / TanStack Query
- Backend: PHP 8 / PDO
- Database: SQLite（WALモード、外部キー有効）
- Testing: Vitest / Testing Library / PHPスモークテスト

## ローカル開発

Node.js、npm、PHP 8、Composerを用意します。

```powershell
npm install
Copy-Item .env.example .env
Set-Location server
composer install
Copy-Item .env.example .env
php bin/migrate.php
php -S 127.0.0.1:8080 -t public/api public/api/index.php
```

別のターミナルでフロントエンドを起動します。

```powershell
npm run dev
```

画面は `http://127.0.0.1:5173` で開きます。実際の認証情報は `.env` に設定し、リポジトリへ追加しないでください。

## 検証

```powershell
npm test
npm run test:php
npm run lint
npm run format:check
npm run build
```

## 配布パッケージ

```powershell
npm run package:deploy
```

`release/kakeizu-studio` に静的ファイルとPHP APIの実行時ファイルが生成されます。`.env`、SQLiteデータ、テスト、開発用依存物は含まれません。生成された `server/.env.example` を参考に、配置環境で `.env` を作成してください。

サブディレクトリに配置する場合は、`VITE_BASE_PATH`、`APP_BASE_PATH`、Apacheの `RewriteBase` を同じ公開パスに合わせてください。HTTPSへの転送はホスティング環境またはリバースプロキシ側で設定します。

## 環境変数

| 変数             | 内容                        |
| ---------------- | --------------------------- |
| `VITE_BASE_PATH` | Reactアプリの公開ベースパス |
| `APP_URL`        | Origin検証に使う公開URL     |
| `APP_BASE_PATH`  | CookieとAPIの公開パス       |
| `DB_PATH`        | SQLiteファイルの保存先      |

## 公開時の注意

- `.env`、SQLite本体、WAL、SHMを公開ディレクトリやGitへ含めないでください。
- 本番ではHTTPSを有効化し、`APP_URL`を実際のHTTPS URLへ変更してください。
- SQLiteと環境変数ファイルは、可能な限り公開ディレクトリ外へ配置してください。

## データについて

このリポジトリには実案件のデータベース、利用者情報、認証情報、クライアント固有のURLや配置情報を含めていません。初回セットアップ時に空のSQLiteデータベースを生成して利用します。
