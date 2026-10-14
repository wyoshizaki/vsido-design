# 変更履歴

写して使っているプロジェクトが、更新を取り込むときに読むためのものです。
**消した・名前を変えた・意味を変えたもの**は、どう直せばよいかまで書きます（足しただけのものは一言でよい）。

## 1.2.0（2026-10-15）

- `reference/at_ui.js`: `initPanelLayout()` に任意の `hiddenListId` を追加。渡すとパネルの見出しに × が付き、パネルを丸ごと非表示にできる（「非表示中: タイトル ↺」で戻す。状態は配置と一緒に保存）。戻り値に `layout()`・`hiddenIds()` を追加。
- `reference/at_ui.css`: `.panel.panel-hidden` / `.panel-hide` / `.hidden-panels` / `.panel-restore` を追加。
- 取り込み側で直すこと: なし（追加だけ。`hiddenListId` を渡さないツールは従来どおり）。

## 1.1.0（2026-10-03）

- `reference/at_gamepad.js`: 入力の一次 IIR フィルタ `createIirFilter()` を追加（VSidoConnectSimple で使っていた版に合わせた）。既存の関数は変更なし。
- `REFERENCE.md`: 「互換性の約束」と「マイコン（ESP32）の内蔵 WebUI で使うとき」を追加。
- 取り込み側で直すこと: なし（追加だけ）。

## 1.0.0

- 最初の版。
