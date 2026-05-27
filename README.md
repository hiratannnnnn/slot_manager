# slot_manager

42のSlotをDiscordから管理するための個人用Botです。

## Setup

```sh
npm install
cp .env.example .env
```

`.env` に以下を設定します。

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
FORTYTWO_CLIENT_ID=
FORTYTWO_CLIENT_SECRET=
FORTYTWO_REDIRECT_URI=http://localhost:3000/auth/42/callback
FORTYTWO_SCOPES=public projects
```

開発中にDiscordのコマンド反映を速くしたい場合は、任意で `DISCORD_GUILD_ID` も設定できます。

レビュー開始前のメンション通知を使う場合は、任意で以下も設定します。

```env
REVIEW_NOTIFY_LEAD_MINUTES=30
REVIEW_NOTIFY_INTERVAL_SECONDS=60
REVIEW_CHANGE_INTERVAL_SECONDS=300
```

通知先はDiscord上で `/register-review-notify` を実行すると登録できます。手動で固定したい場合は、任意で以下も設定できます。

```env
DISCORD_NOTIFY_CHANNEL_ID=
DISCORD_NOTIFY_USER_ID=
```

## Usage

Discord slash commandを登録します。

```sh
npm run commands:register
```

42のユーザー認証をします。

```sh
npm run auth:42
```

表示されたURLをブラウザで開き、42で認可します。成功すると `.fortytwo-token.json` にユーザーtokenが保存されます。このファイルはsecretなのでgit管理しません。

Botを起動します。

```sh
npm start
```

## Commands

- `/ping`: Botの疎通確認
- `/slots`: 自分の42 Slot一覧を表示
- `/create-slot`: 自分のSlotを作成
- `/delete-slot`: 指定した時刻範囲に含まれる自分のSlotを削除
- `/register-review-notify`: 実行したチャンネルで、実行したユーザー宛てのレビュー通知を有効化

`/create-slot` と `/delete-slot` の時刻は `YYYY-MM-DD HH:mm` 形式なら日本時間として扱います。

例:

```text
begin_at: 2026-05-28 03:00
end_at: 2026-05-28 03:45
```

## Current Scope

このBotの主目的は、自分が評価者として出すSlotをDiscordから管理することです。

通知機能として、bookedになっている自分のSlotの開始時刻が近づいたら、登録されたチャンネルで登録ユーザーをメンションできます。また、前回チェック時のレビュー状態と比較して、新しいレビューやキャンセルされたレビューも通知します。

42 APIでは1件のレビューが15分単位の連続Slotとして返ることがあるため、連続したbooked Slotは1つのレビューとしてまとめて扱います。

通知先設定は `.review-notification-settings.json`、開始前通知済みレビューは `.review-notifications.json`、レビュー状態の前回スナップショットは `.review-snapshot.json` に記録します。

中心に使う42 API:

- `GET /v2/me/slots`
- `POST /v2/slots`
- `DELETE /v2/slots/:id`

## Notes From Testing

`/ping`、42 OAuth、`/slots`、`/create-slot` は動作確認済みです。

Slot作成では、42 API側の制約により最低durationがキャンパス設定に依存します。今回の環境では15分では失敗し、45分指定で成功しました。45分のSlot作成結果は、15分単位の複数Slotとして返ることがあります。

`/delete-slot` はID指定ではなく、`/create-slot` と同じ時刻範囲指定にしています。指定範囲に含まれる自分のSlotを取得し、対応するSlot IDを削除します。

## Projects Investigation

一度Projects系コマンドとして `/my-projects`、`/search-project`、`/project-slots` を試しましたが、通常機能から外しました。

理由:

- このBotの本質である「自分のSlot管理」には直接関係しない
- `/my-projects` と `/search-project` はProject情報を見るだけで、Slot運用上の実用性が低い
- Intra上の評価予約画面で見える「自分が実際に予約可能なSlot」と一致しない可能性が高い
- NetPracticeなど実際の課題で確認しても、Intra側に空きSlotが見えないケースがあった
- libft、minishell、NetPracticeなどprojectを変えても、期待した意味での予約可能枠としては信用できなかった
- APIレスポンスには `id`, `begin_at`, `end_at`, `scale_team`, `user` 程度しかなく、campus、project session、提出状態、予約可否をBot側で判断できない

結論として、`GET /v2/projects/:project_id/slots` は「自分が今そのProjectで予約できるSlot一覧」として扱わない方針です。

## Ideas

- 定期的に新しいレビューが入っていないか確認する
- 新しいレビューが入ったときにメンションする
- レビューがキャンセルされたときにメンションする
- Slotやレビュー状況を見やすくするvisualizerを作る

レビュー通知を実装する場合、Slotではなく `scale_teams`、`teams`、`projects_users` などの状態変化を見る方針で調査します。

## Architecture

- Discord Bot層: `src/index.js`, `src/discord/`
- Application Layer: `src/application/`
- 42 API Client層: `src/fortyTwo/`

現在の42 APIアクセスは `UserOAuthTokenProvider` を使い、ローカルに保存したユーザーOAuth tokenで行います。将来、複数ユーザー対応にするときは、Discordユーザーごとのtoken storeに差し替えます。
