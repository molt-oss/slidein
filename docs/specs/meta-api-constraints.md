# Meta API 制約事項

Instagram Messaging API を利用する上で、全開発者が理解すべき制約。

## 認証・アクセス

| 項目 | 内容 |
|---|---|
| アカウント種別 | ビジネス or クリエイターアカウント必須（個人アカウント非対応） |
| Facebook ページ | Instagram アカウントに紐付けが必要 |
| Meta App | Development Mode で自分のアカウントのみ操作可能 |
| App Review | **不要**（OSS = 各ユーザーが自分の Meta App を作成するため） |

## メッセージング制約

| 制約 | 内容 | 対策 |
|---|---|---|
| 24時間ルール | ユーザーからのメッセージ後24時間以内のみ返信可 | Human Agent タグで最大7日間に延長 |
| 先制DM不可 | ユーザーが先にメッセージしないとDM送れない | コメント→DM誘導フローで対応 |
| レート制限 | 200通/時間 | TokenBucket + バックオフ実装 |
| メッセージタイプ | テキスト、画像、テンプレート（ジェネリック、ボタン） | — |

## Webhook

| 項目 | 内容 |
|---|---|
| 検証 | `X-Hub-Signature-256` ヘッダで HMAC-SHA256 署名検証必須 |
| イベント | messages, messaging_postbacks, comments |
| レスポンス | 200 OK を5秒以内に返す必要がある |

## Development Mode の仕様

- App Roles に追加した「テスター」のアカウントのみ操作可能
- テスターは最大2,000人まで追加可能
- Webhook は正常に動作する
- App Review なしでも全API機能にアクセス可能（自分のアカウントに対して）

## 参考リンク

- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/)
- [Webhooks](https://developers.facebook.com/docs/instagram-platform/webhooks/)
- [App Review](https://developers.facebook.com/docs/instagram-platform/app-review/)
