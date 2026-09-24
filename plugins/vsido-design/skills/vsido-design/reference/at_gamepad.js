/* ============================================================================
   at_gamepad.js — ゲームパッドの読み取りと線画表示
   ----------------------------------------------------------------------------
   ブラウザ標準の Gamepad API を使う（追加インストール不要）。
   ・アナログ6本（左右スティックXY・左右トリガー）と、二値ボタン14個を扱う
   ・Xbox/XInput と DirectInput(F310 Dモード) で軸の並びが違うので両対応
   ・線画SVGは AtGamepad.svg() が文字列を返すので、各ツールはそれを埋め込むだけ

   ★安全のため、次のときは「入力なし」として扱う（呼び出し側が停止処理をする）:
     ウィンドウのフォーカス喪失 / タブ非表示 / パッド切断
   ============================================================================ */
"use strict";

const AtGamepad = (() => {

  /* ---------------------------------------------------------------------
     入力の定義。id は設定の保存キーになるので変えないこと。
     kind: "analog" = -1〜+1 / "trigger" = 0〜1 / "button" = 0 or 1
     --------------------------------------------------------------------- */
  const INPUTS = [
    { id:"LX", name:"左スティック X", kind:"analog"  },
    { id:"LY", name:"左スティック Y", kind:"analog"  },
    { id:"RX", name:"右スティック X", kind:"analog"  },
    { id:"RY", name:"右スティック Y", kind:"analog"  },
    { id:"LT", name:"左トリガー",     kind:"trigger" },
    { id:"RT", name:"右トリガー",     kind:"trigger" },
    { id:"A",  name:"A ボタン",       kind:"button", btn:0  },
    { id:"B",  name:"B ボタン",       kind:"button", btn:1  },
    { id:"X",  name:"X ボタン",       kind:"button", btn:2  },
    { id:"Y",  name:"Y ボタン",       kind:"button", btn:3  },
    { id:"L1", name:"L1 (LB)",        kind:"button", btn:4  },
    { id:"R1", name:"R1 (RB)",        kind:"button", btn:5  },
    { id:"BACK",  name:"Back / Select", kind:"button", btn:8  },
    { id:"START", name:"Start",         kind:"button", btn:9  },
    { id:"L3", name:"左スティック押込", kind:"button", btn:10 },
    { id:"R3", name:"右スティック押込", kind:"button", btn:11 },
    { id:"DU", name:"十字 上",   kind:"button", btn:12 },
    { id:"DD", name:"十字 下",   kind:"button", btn:13 },
    { id:"DL", name:"十字 左",   kind:"button", btn:14 },
    { id:"DR", name:"十字 右",   kind:"button", btn:15 },
  ];
  const byId = {};
  INPUTS.forEach(i => { byId[i.id] = i; });

  const isBinary = (id) => (byId[id] ? byId[id].kind === "button" : false);
  const kindOf   = (id) => (byId[id] ? byId[id].kind : "analog");

  /* --------------------------------------------------------------------
     生の値を読む。mode: "xbox" / "dinput"
     -------------------------------------------------------------------- */
  function readRaw(g, mode){
    const v = {};
    INPUTS.forEach(i => { v[i.id] = 0; });
    if(!g) return v;
    const a = g.axes || [], b = g.buttons || [];
    const bv = (n) => (b[n] ? (b[n].value || (b[n].pressed ? 1 : 0)) : 0);

    if(mode === "dinput"){
      /* F310 Dモード等。トリガーが1本の軸(Z)に前後で同居する配置に対応する。
         Zが負なら左、正なら右。L2/R2がボタンとして来る個体も拾う。 */
      const z = a[2] || 0, lb = bv(6), rb = bv(7);
      v.LX = a[0] || 0; v.LY = a[1] || 0;
      v.RX = a[3] || 0; v.RY = a[4] || 0;
      v.LT = lb > 0.001 ? lb : Math.max(0, -z);
      v.RT = rb > 0.001 ? rb : Math.max(0,  z);
    } else {
      v.LX = a[0] || 0; v.LY = a[1] || 0;
      v.RX = a[2] || 0; v.RY = a[3] || 0;
      v.LT = bv(6);     v.RT = bv(7);
    }
    INPUTS.forEach(i => { if(i.kind === "button") v[i.id] = bv(i.btn) > 0.5 ? 1 : 0; });
    return v;
  }

  /* デッドゾーンを掛けた値。アナログは中心から、トリガーは0から。 */
  function applyDeadzone(raw, dead){
    const v = {};
    for(const id in raw){
      const k = kindOf(id);
      let x = raw[id];
      if(k === "analog")       x = Math.abs(x) < dead ? 0 : x;
      else if(k === "trigger") x = x < dead ? 0 : x;
      v[id] = x;
    }
    return v;
  }

  /* いま使うパッドを1つ選ぶ。index 指定があればそれを優先。 */
  function pick(preferredIndex){
    if(!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if(preferredIndex !== null && preferredIndex !== undefined && pads[preferredIndex]) return pads[preferredIndex];
    return Array.from(pads).find(Boolean) || null;
  }

  /* --------------------------------------------------------------------
     線画SVG。要素のIDは gp<入力ID> で固定（updateVisual が同じIDを探す）。
     ★数値の読み取り値はSVGの中に入れない。狭いパネルへ縮めたときに
       文字同士がぶつかって読めなくなるため、SVGは「形」だけを受け持ち、
       数値は readoutHtml() が作るHTMLの行で出す。
     -------------------------------------------------------------------- */
  function svg(){
    return `
<svg class="gp-svg" viewBox="0 0 560 336" role="img" aria-label="ゲームパッド入力状態">
  <!-- トリガーとバンパー -->
  <rect id="gpLT" class="gp-trigger" x="95" y="8"  width="110" height="26" rx="10"/>
  <rect id="gpRT" class="gp-trigger" x="355" y="8" width="110" height="26" rx="10"/>
  <text class="gp-text" x="150" y="27">LT</text><text class="gp-text" x="410" y="27">RT</text>
  <rect id="gpL1" class="gp-control gp-button" x="100" y="40" width="100" height="22" rx="9"/>
  <rect id="gpR1" class="gp-control gp-button" x="360" y="40" width="100" height="22" rx="9"/>
  <text class="gp-text" x="150" y="57">L1</text><text class="gp-text" x="410" y="57">R1</text>

  <!-- 本体 -->
  <path class="gp-body" d="M160 75 H400 C455 75 487 108 494 160 L506 258 C511 300 462 318 438 285 L385 212 H175 L122 285 C98 318 49 300 54 258 L66 160 C73 108 105 75 160 75 Z"/>

  <!-- 十字キー -->
  <rect id="gpDU" class="gp-control gp-pad" x="123" y="102" width="24" height="24" rx="5"/>
  <rect id="gpDD" class="gp-control gp-pad" x="123" y="150" width="24" height="24" rx="5"/>
  <rect id="gpDL" class="gp-control gp-pad" x="99"  y="126" width="24" height="24" rx="5"/>
  <rect id="gpDR" class="gp-control gp-pad" x="147" y="126" width="24" height="24" rx="5"/>

  <!-- A / B / X / Y -->
  <circle id="gpY" class="gp-control gp-button" cx="425" cy="110" r="14"/><text class="gp-text" x="425" y="115">Y</text>
  <circle id="gpA" class="gp-control gp-button" cx="425" cy="166" r="14"/><text class="gp-text" x="425" y="171">A</text>
  <circle id="gpX" class="gp-control gp-button" cx="397" cy="138" r="14"/><text class="gp-text" x="397" y="143">X</text>
  <circle id="gpB" class="gp-control gp-button" cx="453" cy="138" r="14"/><text class="gp-text" x="453" y="143">B</text>

  <!-- Back / Start -->
  <rect id="gpBACK"  class="gp-control gp-button" x="250" y="96" width="24" height="12" rx="6"/>
  <rect id="gpSTART" class="gp-control gp-button" x="286" y="96" width="24" height="12" rx="6"/>
  <text class="gp-value" x="262" y="90">Back</text><text class="gp-value" x="298" y="90">Start</text>

  <!-- スティック -->
  <circle class="gp-control" cx="215" cy="162" r="36"/>
  <circle id="gpStickL" class="gp-control" cx="215" cy="162" r="22"/>
  <circle class="gp-control" cx="345" cy="162" r="36"/>
  <circle id="gpStickR" class="gp-control" cx="345" cy="162" r="22"/>
  <rect id="gpL3" class="gp-control gp-button" x="188" y="204" width="54" height="15" rx="7"/>
  <rect id="gpR3" class="gp-control gp-button" x="318" y="204" width="54" height="15" rx="7"/>
  <text class="gp-value" x="215" y="215">L3 押込</text><text class="gp-value" x="345" y="215">R3 押込</text>

  <text id="gpSummary" class="gp-summary" x="280" y="326">入力待機中</text>
</svg>`;
  }

  /* SVGの下に置く数値の行。値は updateReadout() が書き換える。 */
  function readoutHtml(){
    const cell = (id, label) =>
      `<div class="gp-readout-cell"><span class="gp-readout-label">${label}</span>` +
      `<span class="gp-readout-val" data-readout="${id}">0.00</span></div>`;
    return `<div class="gp-readout">
      ${cell("LX","左X")}${cell("LY","左Y")}${cell("RX","右X")}${cell("RY","右Y")}
      ${cell("LT","LT")}${cell("RT","RT")}
    </div>`;
  }

  function updateReadout(vals){
    document.querySelectorAll("[data-readout]").forEach(el => {
      const v = vals[el.dataset.readout] || 0;
      el.textContent = (v >= 0 ? "+" : "") + v.toFixed(2);
      el.classList.toggle("live", Math.abs(v) > 0.02);
    });
  }

  /* 線画を現在値へ更新する。mapped は「割り当て済みの入力IDの集合」（緑で縁取る） */
  function updateVisual(vals, mapped, summaryText){
    const el = (id) => document.getElementById(id);
    const set = (id, on, cls) => { const e = el(id); if(e) e.classList.toggle(cls || "gp-active", !!on); };

    /* スティックは中身の丸を傾きぶんずらす（中心 215,162 / 345,162 ・ 可動半径14px） */
    const ls = el("gpStickL"), rs = el("gpStickR");
    if(ls){ ls.setAttribute("cx", 215 + vals.LX * 14); ls.setAttribute("cy", 162 + vals.LY * 14); }
    if(rs){ rs.setAttribute("cx", 345 + vals.RX * 14); rs.setAttribute("cy", 162 + vals.RY * 14); }
    set("gpStickL", Math.abs(vals.LX) > .01 || Math.abs(vals.LY) > .01);
    set("gpStickR", Math.abs(vals.RX) > .01 || Math.abs(vals.RY) > .01);

    /* トリガーは踏み込み量を濃さで表す */
    const lt = el("gpLT"), rt = el("gpRT");
    if(lt) lt.style.opacity = (.35 + Math.abs(vals.LT) * .65).toFixed(2);
    if(rt) rt.style.opacity = (.35 + Math.abs(vals.RT) * .65).toFixed(2);

    INPUTS.forEach(i => { if(i.kind === "button") set("gp" + i.id, vals[i.id] > .5); });

    /* 割り当て済みの印（押していなくても緑の縁が付くので、どれが効くか一目で分かる） */
    const isMapped = (id) => !!(mapped && mapped.has(id));
    INPUTS.forEach(i => { if(i.kind === "button") set("gp" + i.id, isMapped(i.id), "gp-mapped"); });
    set("gpLT", isMapped("LT"), "gp-mapped");
    set("gpRT", isMapped("RT"), "gp-mapped");
    set("gpStickL", isMapped("LX") || isMapped("LY"), "gp-mapped");
    set("gpStickR", isMapped("RX") || isMapped("RY"), "gp-mapped");

    const sum = el("gpSummary");
    if(sum) sum.textContent = summaryText || "入力待機中";
    updateReadout(vals);
  }

  /* --------------------------------------------------------------------
     入力一覧パネル（全入力の現在値をバー/丸で並べる）
     -------------------------------------------------------------------- */
  function inputListHtml(){
    return INPUTS.map(i => `
      <div class="gp-input" data-input="${i.id}">
        <div class="gp-input-head">
          <span class="gp-input-name">${i.name}</span>
          <span class="gp-input-val">0.00</span>
        </div>
        <div class="biobar"><span class="biobar-fill"></span></div>
      </div>`).join("");
  }

  function updateInputList(vals){
    document.querySelectorAll(".gp-input").forEach(row => {
      const id = row.dataset.input, v = vals[id] || 0, k = kindOf(id);
      row.querySelector(".gp-input-val").textContent = (v >= 0 ? "+" : "") + v.toFixed(2);
      row.classList.toggle("live", Math.abs(v) > 0.02);
      const fill = row.querySelector(".biobar-fill");
      if(k === "analog"){
        fill.style.left  = v < 0 ? (50 + v * 50) + "%" : "50%";
        fill.style.width = (Math.abs(v) * 50) + "%";
      } else {
        fill.style.left  = "50%";
        fill.style.width = (Math.abs(v) * 50) + "%";
      }
    });
  }

  return { INPUTS, byId, isBinary, kindOf, readRaw, applyDeadzone, pick,
           svg, readoutHtml, updateVisual, inputListHtml, updateInputList };
})();
