<!--
---
id: day117
slug: hash-chain-tamper-trainer
title: "Hash Chain Tamper Trainer"
subtitle_ja: "ハッシュチェーンの改変と作り直しを学ぶ"
subtitle_en: "Learn tampering and rechaining"
description_ja: "架空の記録を改変し、作り直しと守りの計算からハッシュチェーンの検出範囲を確かめる教材"
description_en: "Explore hash-chain detection by changing fictional records, rechaining them and comparing protections"
category_ja: [ハッシュ関数, フォレンジック]
category_en: [Hash Function, Digital Forensics]
difficulty: 2
tags: [hash-chain, sha256, hmac, digital-signature, timestamp, forensics, offline]
repo_url: "https://github.com/ipusiron/hash-chain-tamper-trainer"
demo_url: "https://ipusiron.github.io/hash-chain-tamper-trainer/"
hub: true
---
-->

# Hash Chain Tamper Trainer - ハッシュチェーンの改変と作り直しを学ぶ

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/hash-chain-tamper-trainer?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/hash-chain-tamper-trainer?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/hash-chain-tamper-trainer)
![GitHub license](https://img.shields.io/github/license/ipusiron/hash-chain-tamper-trainer)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/hash-chain-tamper-trainer/)

**Day117 - 生成AIで作るセキュリティツール200**

[English](README.en.md) · 日本語

Hash Chain Tamper Trainerは、ハッシュチェーンで何が見つかり、何が見つからないかを確かめる教材です。
架空の記録を書き換え、後ろのハッシュをすべて計算し直す（作り直す）と検証が通ることを体験できます。先端の控え・HMAC・署名・時刻認証を加えた場合も、鍵を持つ人ごとの結果を実際に計算します。

## 🌐 デモページ

👉 **[Hash Chain Tamper Trainerを開く](https://ipusiron.github.io/hash-chain-tamper-trainer/)**

ダウンロードした`index.html`をブラウザーで開くと、file://でも使えます。インストールとビルドは不要です。

## 📸 スクリーンショット

![入退室サンプルのチェーン](assets/chain.png)

*架空の8行をつなぎます。各ハッシュを開くと64文字の値と入力が見えます。*

![2行目を書き換えた検証結果](assets/tamper.png)

*2行目から合わなくなり、期待するハッシュと保存されたハッシュを表示します。*

![守りと役割の比較](assets/protections.png)

*守りを加えた場合の結果と、独立した控え・時刻の前提を表示します。*

## ✨ 機能

| タブ | 内容 |
|---|---|
| チェーンを作る | 架空の入退室8行と温度6行、1行ずつの計算、行の追加 |
| 改変を試す | 改変7種、最初の不一致、期待値と保存値、トレーラーの検証 |
| 作り直しと守り | 全体の再計算、守り4つと役割2つの比較、組み合わせと4段階の内訳 |
| 座学 | ハッシュの性質からgit・マークルツリーまで11篇 |
| 確認問題 | 選択問題8問、解説、関連する座学への移動と戻り |

日本語・英語と明暗の表示に対応しています。言語を切り替えても入力・計算結果・回答は保持します。タブは矢印キー・Home・Endでも移動できます。

## 📖 使い方

1. 「チェーンを作る」でサンプルを選び、1行ずつの計算を試す
2. 「改変を試す」で2行目を書き換え、最初の不一致とハッシュを確認
3. 「作り直しと守り」で後ろを全部計算し直し、検証が通ることを確認
4. 守りを選んで比較を計算し、第三者と記録係の結果を比較
5. 座学と確認問題で、結果が変わる前提を確認

サンプル・ヘッダー・トレーラーの設定を変えると元のチェーンを作り直します。改変の各操作は元のチェーンのコピーに適用します。守りの比較はサンプルの2行目を書き換える共通条件で行います。

## 🔬 ハッシュチェーンの形式と検証結果

起点はヘッダー行をLFでつないだ文字列のSHA-256です。ヘッダーを外す場合は64個の0を起点にします。各行は「前のハッシュ|項目」の形の文字列、トレーラーは「最後のハッシュ|rows=行数」の形の文字列をハッシュ化します。

ハッシュは16進数64文字、表の表示は先頭12文字と省略記号です。項目はASCIIの4項目で、各1〜64文字、記録は100行までです。カンマ・縦棒・制御文字は受け付けません。空白の除去やUnicodeの正規化は行いません。HMACモードでは起点のSHA-256を保ち、行とトレーラーをHMAC-SHA256にします。

次の表は入退室8行、ヘッダーとトレーラーありの結果です。行の対象は2行目、切り落としは末尾2行です。`-`は残った行に不一致がなく、元のトレーラーだけが合わないことを表します。`pass`は作り直した後に検証が通ることです。

| 操作ID | 操作 | 最初の不一致の行 | 作り直した後 |
|---|---|---|---|
| `rewrite` | 書き換え | 2 | pass |
| `delete` | 削除 | 2 | pass |
| `swap` | 隣と入れ替え | 2 | pass |
| `insert` | 挿入 | 2 | pass |
| `truncate` | 末尾2行を切り落とす | - | pass |
| `header` | ヘッダーの書き換え | 1 | pass |
| `rehashOne` | 書き換えた行だけ再計算 | 3 | pass |

トレーラーがなければ末尾2行の削除は通ります。最後の行だけを書き換えて再計算した場合も、トレーラーがなければ通ります。ヘッダーをチェーンに入れなければ、ヘッダーの変更は検出しません。同じ検証結果になる操作があるため、改変の種類は推定しません。

次の○は改変が見つかる、×は見つからないことを表します。控えは別の人が保持し、時刻認証では検証者が閉じた時刻を記録とは別に知っている前提です。

| 守りID | 守り | 鍵も控えもない第三者 | 鍵を持つ記録係 |
|---|---|---|---|
| `none` | なし | × | × |
| `checkpoint` | 先端の控え | ○ | ○ |
| `hmac` | HMAC-SHA256 | ○ | × |
| `signature` | ECDSA P-256署名 | ○ | × |
| `timestamp` | 仮の時刻認証 | ○ | ○ |

守りの16通りの組み合わせも選べます。たとえばHMACと署名だけなら記録係の作り直しは通りますが、独立した控えを追加すると見つかります。

## 🎯 ユースケース

このツールならではの使い方として、次の3例を試せます。

- 実験ノートの担当者が8行から末尾2行を削り、トレーラーの有無を比較。途中の整合性と「記録が閉じたこと」の違いを確認
- 共同編集の担当者がHMACと署名を選び、第三者は見つかるが記録係は見つからない結果を確認。誰が計算できるかを権限設計の問いに置き換える
- 提出期限を扱う担当者が4段階の内訳を開き、段階3の署名が正しくても段階2の期限を超える結果を確認。内容の正しさと存在した時刻を区別

授業での実演、仕事の記録設計の検討、家庭の備忘録の仕組みの学習、趣味のプログラミング、研究会での議論にも使えます。関連ツールと組み合わせて、ハッシュの種類や署名の鍵を学べます。これらは架空の記録による実験で、現実の記録の真偽を判定するものではありません。

## ⚠️ 制約と前提

作り方が公開されていれば、誰でもチェーンを作り直せます。ハッシュチェーンだけでは改ざんの証明にならないことを、この教材で確認します。

- 控えを持つ人と改変する人が同じなら、控えも置き換えられる
- HMACは鍵を持つ人だけが検証できる。鍵を渡すと、その人も作り直せる
- 署名の秘密鍵を持つ記録係は、新しい先端に署名し直せる
- 時刻認証が示すのは先端が存在した時刻であり、中身の正しさではない
- 仮の認証局はページ内の鍵で署名する再現。本物の認証局の秘密鍵は利用者の手元にない
- 検証者は閉じた時刻を別に知る。再現の時計は1〜4の段階で、実時刻ではない
- ファイル読み込みとDay041のCSV v3検証は第2弾。第1弾では未実装

作者のIPUSIRONはセキュリティ分野の技術書の著者です。作者は本ツールの悪用を勧めません。

## 🔒 プライバシーと安全対策

記録・鍵・控えは端末内だけで扱い、保存も送信もしません。ページを読み直すと消えます。保存するのは言語の選択だけで、localStorageのキーは`hash-chain-tamper-trainer.lang`です。sessionStorage・Cookie・IndexedDBは使いません。

SHA-256・HMAC・ECDSA P-256はWeb Cryptoで計算します。秘密鍵とHMAC鍵は取り出せない設定で生成し、画面に表示しません。仮の時刻認証局を含めて端末内で計算し、外部の認証局やブロックチェーンには問い合わせません。

CSPの`connect-src 'none'`で通信を制限し、DOMは`textContent`と`createElement`で構築します。CDN・外部フォント・依存パッケージはありません。参考文献のリンクを自分で開いた場合は、そのサイトへ移動します。

## 🔗 参考文献と関連ツール

座学に文献ごとの説明とリンクがあります。

- [CyberGhost — Hash Chain](https://www.cyberghostvpn.com/en_US/glossary/hash-chain)
- [Haber & Stornetta (1991), How to time-stamp a digital document](https://doi.org/10.1007/BF00196791)
- [Haber & Stornetta, CRYPTO 1990](https://doi.org/10.1007/3-540-38424-3_32)
- [Schneier & Kelsey (1998), Cryptographic Support for Secure Logs on Untrusted Machines](https://www.usenix.org/conference/7th-usenix-security-symposium/cryptographic-support-secure-logs-untrusted-machines)
- [Schneier & Kelsey (1999), Secure audit logs to support computer forensics](https://doi.org/10.1145/317087.317089)
- [Crosby & Wallach (2009), Efficient Data Structures for Tamper-Evident Logging](https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/efficient-data-structures-tamper-evident)
- [Lamport (1981), Password authentication with insecure communication](https://doi.org/10.1145/358790.358797)
- [RFC 1760 — The S/KEY One-Time Password System](https://www.rfc-editor.org/rfc/rfc1760)
- [RFC 2289 — A One-Time Password System](https://www.rfc-editor.org/rfc/rfc2289)
- [RFC 3161 — Internet X.509 Public Key Infrastructure Time-Stamp Protocol](https://www.rfc-editor.org/rfc/rfc3161)
- [RFC 5816 — ESSCertIDv2 Update for RFC 3161](https://www.rfc-editor.org/rfc/rfc5816)
- [RFC 6962 — Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962)
- [RFC 9162 — Certificate Transparency Version 2.0](https://www.rfc-editor.org/rfc/rfc9162)
- [Pro Git 10.2 — Git Objects](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [Pro Git 7.6 — Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
- [Day041 Mic Gain Logger — CSV](https://github.com/ipusiron/mic-gain-logger/blob/main/docs/csv.md)
- [FIPS 180-4 — Secure Hash Standard](https://doi.org/10.6028/NIST.FIPS.180-4)
- [RFC 4231 — HMAC-SHA test vectors](https://www.rfc-editor.org/rfc/rfc4231)

- [Day041 Mic Gain Logger](https://ipusiron.github.io/mic-gain-logger/)：作り直しを実証した事例。[CSVの説明](https://github.com/ipusiron/mic-gain-logger/blob/main/docs/csv.md)
- [Day002 Hash Identifier](https://ipusiron.github.io/hash-detector/)：ハッシュ文字列の形式から候補を調べるツール
- [Day053 JWT Inspector](https://ipusiron.github.io/jwt-inspector/)：JWTの構造と署名を学ぶツール

## 🧪 テスト

Node 22以上で、依存パッケージを入れずに実行できます。

```sh
npm test
node --check chain-core.js
node --check app.js
```

暗号の既知解答、独立したPythonのhashlibで作ったサンプルの期待値、改変7種、末尾の例外、守りと役割、16通りの組み合わせを検査します。HTML・CSP・日英の辞書・コントラスト・座学・確認問題・READMEの表と画像も検査します。GitHub Actionsはpushとpull_requestで、すべてのJavaScriptの構文検査と`npm test`を実行します。

## 📁 ディレクトリー構造

```text
hash-chain-tamper-trainer/   # 教材のルート
├── .github/                 # GitHubの設定
│   └── workflows/           # 自動検査
│       └── test.yml         # 構文検査とテスト
├── .gitignore               # Gitの除外設定
├── CLAUDE.md                # 開発者向け説明
├── LICENSE                  # MITライセンス
├── README.en.md             # 英語の説明
├── README.md                # 日本語の説明
├── app.js                   # 画面と操作
├── assets/                  # 日本語の画面例
│   ├── chain.png            # チェーンの表示
│   ├── en/                  # 英語の画面例
│   │   ├── chain.png        # チェーンの表示
│   │   └── protections.png  # 守りと役割の表
│   ├── protections.png      # 守りと役割の表
│   └── tamper.png           # 改変の検証結果
├── chain-core.js            # チェーンと暗号の計算
├── index.html               # 5タブの構造
├── messages.js              # 日英の文言
├── package.json             # テストのコマンド
├── samples.js               # 架空のサンプル2種
├── style.css                # 配置と明暗の配色
└── test/                    # 自動テスト
    ├── chain-vectors.json   # 独立したチェーンの期待値
    ├── chain.test.js        # チェーンと改変の検査
    ├── contrast.test.js     # コントラストの検査
    ├── html.test.js         # HTMLとCSPの検査
    ├── i18n.test.js         # 辞書と文体の検査
    ├── learning.test.js     # 座学と問題の検査
    ├── protections.test.js  # 守りと役割の検査
    └── readme.test.js       # 説明と実装の一致
```

## 💻 動作環境

JavaScriptとWeb CryptoのSHA-256・HMAC・ECDSA P-256に対応するブラウザーで動きます。HTTPS、ローカルHTTP、file://で確認しています。

| エンジン | 確認した範囲 |
|---|---|
| Chromium 145 | HTTPとfile://、幅320・390・1280px、日本語と英語 |
| Firefox 146 | HTTPとfile://、幅320・1280px、日本語 |
| WebKit 26.0 | HTTPとfile://、幅390px、日本語と英語 |

Safariの実機、スマートフォンの実機、スクリーンリーダーの読み上げは未検証です。Web Cryptoが使えない環境では計算を止め、理由を表示します。

## 📄 ライセンス

ソースコードは[MIT License](LICENSE)です。引用文と参考文献の権利は、それぞれの著作者に帰属します。

## 🛠️ このツールについて

本ツールは、「生成AIで作るセキュリティツール200」プロジェクトの一環として開発されました。
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、[プロジェクトページ](https://akademeia.info/?page_id=44607)をご覧ください。
