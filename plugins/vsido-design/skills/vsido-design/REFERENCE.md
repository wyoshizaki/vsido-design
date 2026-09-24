# 参照実装の使い方

`theme/` と `reference/` に、実際に動いている実装をそのまま入れてあります。
**新しく作るときは、ゼロから組まずにここからコピーして始めてください。**

---

## ファイルの役割

| ファイル | 中身 | 他プロジェクトでの使いやすさ |
|---|---|---|
| `theme/at_theme.css` | 色トークンの既定値と、角丸・フォント | ◎ そのまま使える |
| `theme/themes/brand.css` | ブランド配色（白地 × 青 × 黄 × 赤） | ◎ そのまま使える |
| `theme/themes/navy.css` `vsido.css` `sumi.css` | 暗い地の配色3種 | ◎ そのまま使える |
| `reference/at_ui.css` | ヘッダ・パネル・表・バー・ログ・ボタンの共通スタイル | ◎ そのまま使える |
| `reference/at_ui.js` | ログ・設定の保存復元・接続灯・**パネルのドラッグ配置**・テーマ切替 | ○ ほぼそのまま |
| `reference/at_gamepad.css` `at_gamepad.js` | ゲームパッドの読み取りと線画SVG | △ ゲームパッドを使う画面だけ |
| `reference/at_chart.js` | 時系列グラフ（依存ライブラリなし） | ○ ほぼそのまま |
| `reference/at_link.js` | サーバとの通信 | ✗ **元プロジェクト専用**。作り直す前提 |
| `logo/*.png` | V-Sidoロゴ 青版・白版 | ◎ |

★`at_link.js` は PowerShell 製のローカルブリッジに合わせた通信層です。
**他プロジェクトではそのまま使えません。** 考え方（送信と受信を1往復にまとめる）だけ参考にしてください。

---

## 最小の組み方

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ツール名</title>
<link rel="stylesheet" href="at_theme.css">   <!-- 既定値。必ず最初 -->
<link rel="stylesheet" href="at_ui.css">
<link rel="stylesheet" href="themes/brand.css"> <!-- 上書き。必ず at_theme.css の後 -->
</head>
<body>

<header>
  <h1><span class="brand-logo" role="img" aria-label="V-Sido"></span>ツール名</h1>
  <span><span id="dot" class="dot"></span><span id="connTxt" class="pill">未接続</span></span>
</header>

<main>
  <div class="toolbar">
    <div class="field"><label>列数</label>
      <div class="colcount-buttons" id="colCountButtons">
        <button data-cols="1">1列</button><button data-cols="2">2列</button><button data-cols="3">3列</button>
      </div></div>
    <button id="layoutReset" class="ghost">レイアウトをリセット</button>
  </div>

  <div class="dash-wrap" id="dashWrap">
    <!-- パネルはこの形でいくつでも並べる。data-panel-id は保存キーなので変えない -->
    <div class="panel" data-panel-id="なにか">
      <div class="panel-head">
        <span class="drag-handle" draggable="true" title="ドラッグで移動">⠿</span>
        <button class="collapse-toggle" title="開閉">▼</button>
        <h3 class="panel-title">パネルの名前</h3>
      </div>
      <div class="panel-body">ここに中身</div>
    </div>
  </div>
</main>

<script src="at_ui.js"></script>
<script>
const $ = AtUI.$;
AtUI.initLog("log");
AtUI.initPanelLayout({ wrapId:"dashWrap", buttonsId:"colCountButtons", resetId:"layoutReset",
                       storageKey:"わたしのツール_layout_v1", defaultColumns:2 });
</script>
</body>
</html>
```

---

## 使えるクラス名

独自のCSSを書く前に、これで足りないか確認してください。

| クラス | 何 |
|---|---|
| `.panel` / `.panel-head` / `.panel-body` | ドラッグ配置できるパネル |
| `.toolbar` / `.toolbar.tight` | 横並びの操作列 |
| `.field` | ラベル＋入力のひとかたまり |
| `.switch` | チェックボックス＋ラベル |
| `.pill` / `.pill.ok` / `.pill.err` / `.pill.warn` / `.pill.wrap` | 小さなラベル |
| `.dot` / `.dot.ok` | 接続灯 |
| `button.ghost` / `button.warn` / `button.sm` | 控えめ／危険／小さいボタン |
| `.tblwrap` + `table` | 横スクロールする表（ヘッダ固定） |
| `.metricbar` + `.metricbar-fill` + `.metricbar-val` | 数値のバー |
| `.biobar` + `.biobar-fill` | 中央基準の双方向バー |
| `.log` | ログの枠 |
| `canvas.chart` | グラフ |
| `.lamp` / `.lamp.on` | エラーランプ |
| `.brand-logo` | ヘッダのロゴ |
| `.hidden` | 非表示 |

---

## 気をつけるところ

### ロゴのパス

`at_theme.css` と各テーマの `--logo-url` は、元プロジェクトの配信パス
（`/lib/vsido_logo_white.png`）を指しています。**プロジェクトに合わせて書き換えてください。**

```css
--logo-url: url("assets/vsido_logo_white.png");
```

表示寸法は `at_ui.css` の `.brand-logo` にあります。元画像は 972 × 271 なので、
**比率 3.587 を保って**変えてください（既定は 104 × 29）。

### テーマの読み込み順

`at_theme.css`（既定値）→ `themes/<名前>.css`（上書き）の順です。逆にすると効きません。
画面から切り替えたい場合は、`at_ui.js` の `AtUI.initThemePicker()` が
`<link>` を差し替える形で実装してあるので、それをそのまま使えます。

### パネル配置の保存キー

`initPanelLayout()` の `storageKey` は**プロジェクトごとに変えてください**。
同じキーだと、別のツール同士でレイアウトを食い合います。
`data-panel-id` も保存に使われるので、後から変えると保存済みの配置が無効になります
（構成が変わったことを検出して既定へ戻す作りにはなっています）。

### localStorage はオリジン単位

ローカルで複数のツールを動かす場合、**HTTPポートが同じだと設定を共有してしまいます。**
ツールごとにポートを分けてください（実際にこれで設定を食い合う不具合がありました）。

---

## 新しいテーマを足すとき

`theme/themes/` に `.css` を1つ置くだけです。中身は既存をコピーして色を変えるのが早いです。

★**色トークンは全部書いてください。** 1つでも欠けると、そこだけ `at_theme.css` の
既定値（暗い配色）が顔を出します。追加したら、全テーマに同じトークンがあるか確認してください。
