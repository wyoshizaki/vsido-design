# クラウドセッション（claude.ai/code）で使うとき

**プラグインはクラウドセッションでは読み込まれません。** ターミナルやデスクトップアプリの
Claude Code では `/plugin install` で入りますが、ブラウザから使うクラウドセッションは
別の経路になります。

そちらでも「V-Sido標準のデザインに寄せて」を効かせたい場合は、
**このフォルダの `SKILL.md` を、対象プロジェクトのリポジトリへコミット**してください。

```
<プロジェクト>/.claude/skills/vsido-design/SKILL.md
```

クラウドセッションはリポジトリをクローンして動くので、これなら確実に読まれます。
**実際に動作を確認済みです。**

---

## 手順

```bash
mkdir -p .claude/skills/vsido-design
curl -o .claude/skills/vsido-design/SKILL.md \
  https://raw.githubusercontent.com/wyoshizaki/vsido-design/main/for-cloud-sessions/SKILL.md
git add .claude/skills/vsido-design/SKILL.md
git commit -m "V-Sido標準デザインのスキルを追加"
git push
```

★**`.gitignore` で `.claude/` を除外しているリポジトリでは、先に除外を解いてください。**
ありがちな設定なので、最初に確認してください。

```gitignore
.claude/
!.claude/skills/
```

---

## なぜ軽い版なのか

このフォルダの `SKILL.md` は、本体（`plugins/vsido-design/skills/vsido-design/SKILL.md`）から
**要点だけを抜き出した1ファイル**です。各プロジェクトへコピーする前提なので、
画像や参照実装は含めず、代わりにこのリポジトリのURLを案内しています。

そのぶん**更新は自動で伝わりません。** 配色を変えたときは、コピー先のプロジェクトでも
上の `curl` を流し直してください。

| | プラグイン（本体） | この軽い版 |
|---|---|---|
| 使えるところ | ターミナル・デスクトップアプリ | **クラウドセッション**・どこでも |
| 入れ方 | `/plugin install` を1回 | プロジェクトごとにコミット |
| 中身 | 考え方・実測値・色トークン・ロゴ・参照実装 | 要点のみ |
| 更新 | `/plugin update` | 手動で取り直す |
