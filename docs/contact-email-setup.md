# 問い合わせメール（Amazon SES）設定手順書

`/contact` の送信後に、次の2通を送る設定です。

- **管理者通知**: カテゴリに応じた宛先（`ivmz@` / `mizzz@` / `contact@` / `security@ivrm.jp`）へ届きます。
- **受付メール**: フォームを送信した本人へ届きます。本文は固定文と受付番号だけで、入力内容は載せません。

設定が済むまでの間は、問い合わせは CMS の Inbox に保存されるだけです（通知状態は `skipped`）。

## 現在の状況（2026-10-09 時点）

| 項目 | 状態 | 担当 |
| --- | --- | --- |
| SES アイデンティティ `ivrm.jp`（us-east-2） | **確認済み（DKIM: SUCCESS、2026-10-09）** | 完了 |
| 構成セット `ivmz-contact` | 作成済み（CloudWatch にバウンス・苦情・配信イベントを記録） | 完了 |
| 送信専用 IAM ユーザー `ivmz-home-contact-ses` | 作成済み・最小権限の送信ポリシー付き。アクセスキー発行済み（2026-10-09） | 完了 |
| 本番利用申請（サンドボックス解除） | ケース 179153501400846 に追加情報を返信済み（2026-10-09）。AWS の再審査結果待ち | AWS の回答待ち |
| Netlify 環境変数 | 設定済み（2026-10-09）。反映には新しい本番デプロイが必要 | 手順 5 で確認 |

> サンドボックスの間は、確認済みドメイン `ivrm.jp` 宛て（管理者通知）だけが届きます。訪問者への受付メールは、本番利用申請が承認されるまで送れません（`CONTACT_ACK_FAILED` が記録されるだけで、管理者通知と保存には影響しません）。

### 注意: AWS の操作がルートアカウントで行われていた

今回の AWS 操作は、ルートユーザー（`arn:aws:iam::911291529944:root`）の認証情報で実行されていました。
日常運用では使わず、管理者用 IAM ユーザー（または IAM Identity Center）に切り替えることを強くおすすめします。
ルートユーザーには MFA を設定し、アクセスキーは削除してください。

## 手順 1. DKIM の DNS レコードを追加する（完了）

2026-10-09 に `ivrm.jp` の DNS へ次の CNAME を3件追加し、SES の DKIM が SUCCESS、アイデンティティが確認済みになりました。
この手順は再作業不要です。DNS を作り直す場合の参照として残します。

| 種類 | 名前（ホスト） | 値 |
| --- | --- | --- |
| CNAME | `lcjx3emwhpqyii2j33kcf6766fwuzcy5._domainkey.ivrm.jp` | `lcjx3emwhpqyii2j33kcf6766fwuzcy5.dkim.amazonses.com` |
| CNAME | `64xgrjizfiyoqje2qakzddcciiycqtd4._domainkey.ivrm.jp` | `64xgrjizfiyoqje2qakzddcciiycqtd4.dkim.amazonses.com` |
| CNAME | `qkm2vlmnmoxxxvv2mqaa5jfqemrgy3lt._domainkey.ivrm.jp` | `qkm2vlmnmoxxxvv2mqaa5jfqemrgy3lt.dkim.amazonses.com` |

- 既存の DMARC（`_dmarc.ivrm.jp`）は、SES を通すために緩めないでください。
- 任意（推奨）: カスタム MAIL FROM ドメイン（例: `mail.ivrm.jp`）を設定すると、SPF のアラインメントが取れます。

## 手順 2. 本番利用申請（サンドボックス解除）

サンドボックスでは、確認済みアドレスにしか送れません。そのため受付メールが届きません。

私が Support/SES 経由で申請しましたが、結果は **DENIED（ケース ID 179153501400846）** でした。
多くの場合、ドメインが未確認の状態や、用途説明の不足が理由です。次の順で対応します。

1. `ivrm.jp` は手順 1 で確認済みです（**完了**）。API での再申請は競合エラーになるため、サポートケースへの返信で再審査を依頼します。
2. AWS サポート（ケース ID 179153501400846 に返信）へ、次の内容で再審査を依頼します。

> Contact form on a personal website (https://ivmz.ivrm.jp/contact). Each submission sends one
> notification to the site owner and one plain-text receipt to the person who submitted the form
> (fixed text and a reference id only; nothing the visitor typed is echoed). Expected volume is
> under 50 messages per month. The domain ivrm.jp is now verified with DKIM. Bounces and complaints
> are recorded via the configuration set "ivmz-contact" (CloudWatch event destination) and the
> account-level suppression list is enabled for BOUNCE and COMPLAINT.

3. 承認は、通常 24 時間前後です。

## 手順 3. IAM ユーザーのアクセスキーを発行する（あなたの作業）

IAM ユーザー `ivmz-home-contact-ses` は作成済みです。付いている権限は、`ivrm.jp` と構成セット
`ivmz-contact` に対する `ses:SendEmail`（送信元は `ivmz@ivrm.jp` のみ）だけです。

秘密鍵をチャットに残さないため、アクセスキーの発行はあなたにお願いします。

1. IAM → ユーザー → `ivmz-home-contact-ses` → **セキュリティ認証情報** → **アクセスキーを作成**。
2. 用途は「AWS の外部で実行されるアプリケーション」を選びます。
3. 表示されたキー ID とシークレットを、手順 4 でそのまま Netlify に貼り付けます。画面を閉じた後は、シークレットを再表示できません。

## 手順 4. Netlify の環境変数（本番のみ）

Netlify → ivmz-home → Site configuration → Environment variables。
スコープは **Production のみ**、シークレットは「Contains secret values」にします。

| 変数名 | 値 |
| --- | --- |
| `CONTACT_SES_REGION` | `us-east-2` |
| `CONTACT_SES_ACCESS_KEY_ID` | 手順 3 のキー ID |
| `CONTACT_SES_SECRET_ACCESS_KEY` | 手順 3 のシークレット（secret） |
| `CONTACT_SES_CONFIGURATION_SET` | `ivmz-contact` |
| `CONTACT_FROM_EMAIL` | `ivmz@ivrm.jp` |
| `CONTACT_AUTOREPLY` | 任意。`off` にすると受付メールを送りません |

Deploy Preview には設定しないでください（Preview は実際には送信しません）。
保存後、**新しい本番デプロイ**を実行します（環境変数は次のビルドで反映されます）。

## 手順 5. 動作確認

1. `https://ivmz.ivrm.jp/contact` から、自分のメールアドレスで送信します。
2. 次の4点を確認します。
   - 確認画面が出て、送信後に完了メッセージが出る。
   - `/admin` → Inbox に記録され、通知状態が `sent` になっている。
   - カテゴリの宛先に管理者通知が届く。
   - 自分のアドレスに受付メールが届く。
3. 通知状態が `failed` / `unknown` の場合は、Netlify の Functions ログで `CONTACT_NOTIFY_FAILED` を確認します。受付メールだけが失敗した場合は `CONTACT_ACK_FAILED` が出ます。
4. 初回送信の後に、SES コンソールでバウンス・苦情が出ていないか確認します。

## 後片付け・ロールバック

- 通知を止めるには、Netlify の `CONTACT_SES_*` 変数を削除して再デプロイします。保存（Inbox）は影響を受けません。
- AWS 側を戻す場合は、IAM ユーザー `ivmz-home-contact-ses` と構成セット `ivmz-contact` を削除し、`ivrm.jp` の DKIM CNAME 3件を DNS から削除します。
