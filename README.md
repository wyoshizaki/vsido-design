# V-Sido 標準デザイン

ロボット制御まわりのツール・管理画面の**見た目を揃えるための決まり**です。
Claude Code のプラグインとして配っているので、**入れておけば
「V-Sido標準のデザインに寄せて」の一言で伝わります。**

---

## 入れ方

Claude Code で一度だけ次を実行します。

```
/plugin marketplace add wyoshizaki/vsido-design
/plugin install vsido-design@vsido
```

以降はどのプロジェクトでも、

> V-Sido標準のデザインに寄せてください

と言えば、配色・ロゴ・画面の組み方が適用されます。
「いつもの配色で」「社内標準の見た目に」でも反応します。

### 更新したいとき

```
/plugin marketplace update vsido
/plugin update vsido-design@vsido
```

### 入れずに使いたいとき

プラグインを入れなくても、**このリポジトリのURLを伝えるだけ**でも使えます。

> https://github.com/wyoshizaki/vsido-design を見て、V-Sido標準のデザインに寄せてください

---

## 中身

```
plugins/vsido-design/skills/vsido-design/
├── SKILL.md        … 本体。3つの原則・色の使い方・画面の組み方
├── PRINCIPLES.md   … なぜその配色なのか。実測値と、実際に踏んだ失敗
├── REFERENCE.md    … 参照実装の使い方
├── theme/          … 色トークン（既定値＋配色4種）
├── logo/           … V-Sidoロゴ 青版・白版
└── reference/      … 共通CSS/JS の実装一式
```

---

## この設計の要点

**色の値より、制約のほうが大事です。**

| 色 | 白地でのコントラスト比 | 使えるところ |
|---|---:|---|
| 青 `#4169e1` | 4.85 | 文字にも、白文字を乗せる帯にも |
| 赤 `#d71345` | 5.16 | 文字に |
| 黄 `#ffd700` | **1.40** | ★白い面では文字にも細い線にも使えない |

黄色を線に使うと必ずぼやけます。だから**明るい黄は面に、白地の文字と線には暗い金**、
という2段構えにしてあります。こうした判断の根拠は `PRINCIPLES.md` に実測値つきで残してあります。

配分の目安はロゴの配色比です。**白が大半、青が 8〜10%、黄が 2%、赤は 1% 以下。**

---

## 更新するとき

1. `plugins/vsido-design/skills/vsido-design/` の中身を直す
2. `plugins/vsido-design/.claude-plugin/plugin.json` と
   `.claude-plugin/marketplace.json` の `version` を上げる
3. push する

利用者側は `/plugin update vsido-design@vsido` で反映されます。
★**`version` を上げ忘れると利用者に届きません。**

新しい配色を足したときや、制約が変わったときは、`SKILL.md` の
「色ごとの制約」と `PRINCIPLES.md` の実測値も一緒に直してください。
**値だけ更新して制約を放置すると、次に使う人が同じ判断を再現できなくなります。**
