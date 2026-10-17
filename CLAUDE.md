# Hash Chain Tamper Trainerの開発

このリポジトリーは、ハッシュチェーンの改変と作り直しを体験するDay117の教材です。表示する判定は実際の暗号計算から求めます。

## 構成

- `chain-core.js`：DOMに依存しないUMD。`HashChainCore`を公開
- `samples.js`：架空のASCIIサンプル2種。入退室8行、温度6行
- `messages.js`：静的・動的な文言の日英辞書
- `app.js`：5タブ、DOM構築、操作と計算結果の保持
- `style.css`：幅320px以上、44px以上の操作要素、明暗の配色
- `test/`：暗号の既知解答、改変と守り、HTML、辞書、配色、教材、README
- `.github/workflows/test.yml`：Node 22の構文検査とテスト

## コマンド

依存パッケージはありません。Node 22以上で実行します。

```sh
npm test
node --check chain-core.js
node --check app.js
```

変更したすべてのJavaScriptに`node --check`を実行します。`index.html`はfile://、ローカルHTTP、公開HTTPSで確認します。

## データと暗号の規則

- 起点：LFでつないだヘッダーのSHA-256。ヘッダーを除く場合は64個の0
- 行：`previousHash + '|' + fields.join(',')`のSHA-256
- トレーラー：`lastHash + '|rows=' + count`のSHA-256
- ハッシュ：16進数64文字。表示の省略は先頭12文字と省略記号
- 入力：ASCIIの4項目、各1〜64文字、最大100行。カンマ・縦棒・制御文字を拒否。自動で空白を削除しない
- HMAC：データ行とトレーラーをHMAC-SHA256に置換。起点はSHA-256
- 署名：ECDSA P-256。秘密鍵とHMAC鍵は`extractable: false`。固定の署名値を期待しない
- 守り：独立した控え、HMAC、署名、仮の時刻認証と、その16通りの組み合わせ
- 時刻認証：記録を閉じた段階2を検証者が別に知る。段階3の新しい署名が正しくても期限を超えれば不一致
- 期待値：SHA-256の既知値、RFC 4231、独立したPythonのhashlibで作成した`test/chain-vectors.json`。実装に合わせて期待値を変えない

## 表示・安全・検証

本文はですます調、箇条書きと表はである調にします。日英の文言は辞書にそろえます。言語の変更は描画だけで、直前の計算結果と回答を保持します。

DOMは`createElement`と`textContent`で組み立てます。CSPは`connect-src 'none'`を含む許可制です。通信API、Worker、外部フォント、CDN、依存パッケージ、ES moduleを追加しません。

記録・鍵・控えを保存せず、秘密鍵を表示しません。localStorageは`hash-chain-tamper-trainer.lang`だけを使います。ストレージが使えなくても操作できるようにします。ファイル読み込みとDay041のCSV v3検証は将来の拡張です。

改変7種の最初の不一致、末尾とトレーラーの例外、全部を作り直した結果、守りと役割の表を確認します。HTTPとfile://でChromium・Firefox・WebKitを確認し、狭い幅と日英、明暗、キーボード操作、CSP、外部通信、保存領域も確認します。Safari実機、スマートフォン実機、スクリーンリーダーは別途確認が必要です。
