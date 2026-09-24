/* ============================================================================
   at_ui.js — 共通UI部品（DOM小物・ログ・設定保存・パネルレイアウト）
   ----------------------------------------------------------------------------
   すべて AtUI 名前空間の下に置く。各ツールの inline <script> から呼ぶ。
   ============================================================================ */
"use strict";

const AtUI = (() => {

  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const num = (v, fallback) => { const n = parseFloat(v); return isNaN(n) ? (fallback || 0) : n; };
  const esc = (s) => String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  /* ---------------------------------------------------------------- ログ */
  let logEl = null;
  function initLog(id){ logEl = $(id); }
  function log(msg, color){
    if(!logEl) return;
    const line = document.createElement("div");
    if(color) line.style.color = color;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.appendChild(line);
    while(logEl.childElementCount > 200) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }
  const logNg   = (m) => log(m, "var(--ng)");
  const logWarn = (m) => log(m, "var(--warn)");

  /* ------------------------------------------------- 設定の保存・復元 */
  /* ツールごとに別キーを使う（Store.create("...") で名前空間を切る）。
     localStorage は同じオリジン（= 同じHTTPポート）で共有されるので、
     ツール間でポートが被っていると設定を食い合う点に注意。 */
  function createStore(key){
    const read = () => { try { return JSON.parse(localStorage.getItem(key) || "null") || {}; } catch(e){ return {}; } };
    const write = (d) => { try { localStorage.setItem(key, JSON.stringify(d)); } catch(e){} };
    return {
      all: read,
      get(k, fallback){ const d = read(); return (k in d) ? d[k] : fallback; },
      set(k, v){ const d = read(); d[k] = v; write(d); },
      merge(obj){ const d = read(); Object.assign(d, obj); write(d); },
      clear(){ try { localStorage.removeItem(key); } catch(e){} },
      /* チェックボックス/入力欄を一括で「変更したら保存」にする */
      bindCheckboxes(ids){
        ids.forEach(id => { const el = $(id); if(el) el.addEventListener("change", () => this.set(id, el.checked)); });
      },
      bindValues(ids){
        ids.forEach(id => { const el = $(id); if(el) el.addEventListener("change", () => this.set(id, el.value)); });
      },
      restoreCheckboxes(ids){
        const d = read();
        ids.forEach(id => { if(typeof d[id] === "boolean"){ const el = $(id); if(el) el.checked = d[id]; } });
      },
      restoreValues(ids){
        const d = read();
        ids.forEach(id => { if(typeof d[id] !== "undefined"){ const el = $(id); if(el) el.value = d[id]; } });
      },
    };
  }

  /* ---------------------------------------------------------- 接続灯 */
  function setConn(dotId, textId, ok, okText, ngText){
    const dot = $(dotId), txt = $(textId);
    if(dot) dot.className = "dot" + (ok ? " ok" : "");
    if(txt){
      txt.textContent = ok ? (okText || "接続中") : (ngText || "応答なし");
      txt.classList.toggle("ok", !!ok);
    }
  }

  /* ------------------------------------------------- 送信レート表示 */
  function createRateMeter(pillId){
    let count = 0, last = Date.now();
    setInterval(() => {
      const now = Date.now();
      const el = $(pillId);
      if(el) el.textContent = (count / ((now - last) / 1000)).toFixed(1) + " Hz";
      count = 0; last = now;
    }, 1000);
    return { tick(){ count++; } };
  }

  /* ==========================================================================
     ダッシュボードのパネルレイアウト
     --------------------------------------------------------------------------
     ・列数を選べる（2〜4列）
     ・パネルの掴み手(⠿)をドラッグして列内・列間を並び替えできる
     ・パネルごとに開閉でき、列構成・順序・開閉状態を localStorage へ保存する
     使い方: AtUI.initPanelLayout({ wrapId:"dashWrap", buttonsId:"colCountButtons",
                                    resetId:"layoutReset", storageKey:"...", defaultColumns:2 })
     ========================================================================== */
  function initPanelLayout(opt){
    const wrap = $(opt.wrapId);
    const KEY = opt.storageKey;
    const DEFAULT_COLS = opt.defaultColumns || 2;
    let draggingId = null;
    let columnCount = DEFAULT_COLS;

    const getColumns = () => Array.from(wrap.querySelectorAll(".dash-col"));
    const allPanels  = () => Array.from(document.querySelectorAll(".panel[data-panel-id]"));

    function wireColumnDrop(col){
      col.addEventListener("dragover", e => {
        if(!draggingId) return;
        e.preventDefault();
        col.classList.add("drag-over-col");
      });
      col.addEventListener("dragleave", () => col.classList.remove("drag-over-col"));
      col.addEventListener("drop", e => {
        e.preventDefault();
        col.classList.remove("drag-over-col");
        if(!draggingId) return;
        const el = document.querySelector(`.panel[data-panel-id="${draggingId}"]`);
        draggingId = null;
        if(el){ col.appendChild(el); save(); }   // パネル以外（列の余白）へのドロップは末尾へ
      });
    }

    function buildColumns(n){
      wrap.innerHTML = "";
      for(let i = 0; i < n; i++){
        const col = document.createElement("div");
        col.className = "dash-col";
        col.dataset.colIdx = i;
        wrap.appendChild(col);
        wireColumnDrop(col);
      }
    }

    function updateButtons(){
      document.querySelectorAll(`#${opt.buttonsId} button`).forEach(b =>
        b.classList.toggle("active", parseInt(b.dataset.cols, 10) === columnCount));
    }

    /* パネルを列へ振り分ける。
       opt.defaultLayout に「列ごとのパネルID配列」を渡しておくと、その並びを優先する。
       ★ラウンドロビンだけだと、背の高いパネルが片側に偏って一方の列がスカスカになる。
         ツール側で「この列にはこれ」と決められるようにしてある。
       列数が defaultLayout の列数と違うときは、指定順を保ったまま順に詰め直す。 */
    function setColumnCount(n, skipSave){
      const panels = allPanels();
      const byId = {};
      panels.forEach(p => { byId[p.dataset.panelId] = p; });
      columnCount = n;
      buildColumns(n);
      const cols = getColumns();

      const preset = opt.defaultLayout;
      if(preset && preset.length === n){
        const placed = new Set();
        preset.forEach((ids, i) => ids.forEach(id => {
          if(byId[id]){ cols[i].appendChild(byId[id]); placed.add(id); }
        }));
        panels.forEach((p, k) => { if(!placed.has(p.dataset.panelId)) cols[k % n].appendChild(p); });
      } else if(preset){
        // 列数が違う場合は、既定の並び順のまま端から詰める
        const order = preset.flat().filter(id => byId[id]);
        panels.forEach(p => { if(!order.includes(p.dataset.panelId)) order.push(p.dataset.panelId); });
        order.forEach((id, k) => cols[k % n].appendChild(byId[id]));
      } else {
        panels.forEach((p, i) => cols[i % n].appendChild(p));   // 指定が無ければラウンドロビン
      }
      updateButtons();
      if(!skipSave) save();
    }

    function applyCollapsed(panel, collapsed){
      const body = panel.querySelector(".panel-body");
      const btn  = panel.querySelector(".collapse-toggle");
      body.classList.toggle("collapsed", collapsed);
      if(btn) btn.textContent = collapsed ? "▶" : "▼";
    }

    function save(){
      const cols = getColumns().map(col =>
        Array.from(col.querySelectorAll(".panel[data-panel-id]")).map(p => ({
          id: p.dataset.panelId,
          collapsed: p.querySelector(".panel-body").classList.contains("collapsed"),
        })));
      try { localStorage.setItem(KEY, JSON.stringify({ columnCount, columns: cols })); } catch(e){}
    }

    function load(){
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch(e){}
      const byId = {};
      allPanels().forEach(p => { byId[p.dataset.panelId] = p; });
      if(saved && Array.isArray(saved.columns)){
        // 保存時とパネル構成が食い違っていたら使わない（ツール更新でのズレ防止）
        const now   = Object.keys(byId).slice().sort().join(",");
        const then  = saved.columns.flat().map(x => x.id).slice().sort().join(",");
        if(now === then){
          columnCount = saved.columnCount || DEFAULT_COLS;
          buildColumns(columnCount);
          const cols = getColumns();
          saved.columns.forEach((colData, i) => {
            if(!cols[i]) return;
            colData.forEach(entry => {
              const p = byId[entry.id];
              if(!p) return;
              applyCollapsed(p, !!entry.collapsed);
              cols[i].appendChild(p);
            });
          });
          updateButtons();
          return;
        }
      }
      setColumnCount(DEFAULT_COLS, true);
    }

    function wirePanel(panel){
      const toggle = panel.querySelector(".collapse-toggle");
      const handle = panel.querySelector(".drag-handle");
      if(toggle) toggle.addEventListener("click", () => {
        applyCollapsed(panel, !panel.querySelector(".panel-body").classList.contains("collapsed"));
        save();
      });
      if(handle){
        handle.addEventListener("dragstart", e => {
          draggingId = panel.dataset.panelId;
          panel.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
        });
        handle.addEventListener("dragend", () => panel.classList.remove("dragging"));
      }
      panel.addEventListener("dragover", e => {
        if(!draggingId || draggingId === panel.dataset.panelId) return;
        e.preventDefault();
        e.stopPropagation();   // 列側の「末尾へ追加」より、パネル単位の割り込みを優先
        panel.classList.add("drag-over");
      });
      panel.addEventListener("dragleave", () => panel.classList.remove("drag-over"));
      panel.addEventListener("drop", e => {
        e.preventDefault();
        e.stopPropagation();
        panel.classList.remove("drag-over");
        if(!draggingId || draggingId === panel.dataset.panelId) return;
        const el = document.querySelector(`.panel[data-panel-id="${draggingId}"]`);
        draggingId = null;
        if(el){ panel.parentNode.insertBefore(el, panel); save(); }
      });
    }

    allPanels().forEach(wirePanel);
    document.querySelectorAll(`#${opt.buttonsId} button`).forEach(btn =>
      btn.addEventListener("click", () => setColumnCount(parseInt(btn.dataset.cols, 10))));
    if(opt.resetId){
      const r = $(opt.resetId);
      if(r) r.addEventListener("click", () => {
        if(!confirm("レイアウトを初期状態に戻しますか？")) return;
        try { localStorage.removeItem(KEY); } catch(e){}
        location.reload();
      });
    }
    load();
    return { save, setColumnCount };
  }

  /* ==========================================================================
     配色テーマの切り替え
     --------------------------------------------------------------------------
     lib/web/themes/*.css を at_theme.css の後に読み込ませて、色トークンだけを
     上書きする。ファイルを足せば選択肢が増える（このJSは触らなくてよい）。
     選択はブラウザ（localStorage）に保存する。
     使い方: AtUI.initThemePicker({ selectId:"themePicker", storageKey:"..." })
     ========================================================================== */
  const THEME_LABELS = {
    brand: "ブランド（白×青×黄）",
    navy:  "現行（ネイビー）",
    vsido: "V-Sido（漆黒×シアン）",
    sumi:  "墨（炭×金）",
  };

  function applyTheme(name){
    let link = document.getElementById("atThemeLink");
    if(!name || name === "default"){
      if(link) link.remove();
      return;
    }
    if(!link){
      link = document.createElement("link");
      link.id = "atThemeLink";
      link.rel = "stylesheet";
      // at_theme.css より後ろに置く必要があるので、<head> の末尾へ足す
      document.head.appendChild(link);
    }
    link.href = "/lib/themes/" + encodeURIComponent(name) + ".css";
  }

  async function initThemePicker(opt){
    const sel = $(opt.selectId);
    if(!sel) return;
    const KEY = opt.storageKey || "at_theme";
    let names = [];
    try{
      const r = await fetch("/themes");
      const j = await r.json();
      names = j.themes || [];
    }catch(e){}
    sel.innerHTML = '<option value="default">既定</option>' +
      names.map(n => `<option value="${esc(n)}">${esc(THEME_LABELS[n] || n)}</option>`).join("");
    /* 初回は opt.defaultTheme（無ければ "default"＝at_theme.css のまま）を選ぶ */
    const first = opt.defaultTheme || "default";
    let saved = first;
    try{ saved = localStorage.getItem(KEY) || first; }catch(e){}
    if(![...sel.options].some(o => o.value === saved)) saved = "default";
    sel.value = saved;
    applyTheme(saved);
    sel.addEventListener("change", () => {
      applyTheme(sel.value);
      try{ localStorage.setItem(KEY, sel.value); }catch(e){}
    });
  }

  return { $, clamp, clamp01, num, esc, initLog, log, logNg, logWarn,
           createStore, setConn, createRateMeter, initPanelLayout,
           applyTheme, initThemePicker };
})();
