/* ============================================================================
   at_chart.js — 時系列グラフ（軽量・依存ライブラリなし）
   ----------------------------------------------------------------------------
   テレメトリの履歴を <canvas> へ折れ線で描く。色は at_theme.css の
   --series-* を getComputedStyle で読むので、テーマを変えれば線の色も変わる。

   使い方:
     const chart = AtChart.create({ canvasId:"chartCanvas", windowInputId:"graphWindow" });
     chart.push({ agl:[...], objagl:[...], vel:[...], cur:[...] });   // 1フレーム積む
     chart.setSeries([{ key:"agl", color:"--series-agl", enabled:()=>$("graphAgl").checked,
                        norm:(v,axis)=>0..1 }, ...]);
   ============================================================================ */
"use strict";

const AtChart = (() => {

  const MAX_FRAMES = 3000;   // 暴走防止の上限（実際の表示範囲は「表示時間」で絞る）

  function cssVar(name, fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function create(opt){
    const frames = [];
    let series = [];
    let axisCount = () => 1;

    function push(sample){
      frames.push(Object.assign({ t: Date.now() }, sample));
      if(frames.length > MAX_FRAMES) frames.shift();
    }
    function clear(){ frames.length = 0; draw(); }

    function draw(){
      const canvas = document.getElementById(opt.canvasId);
      if(!canvas) return;
      const w = canvas.clientWidth || 800, h = canvas.clientHeight || 260;
      if(canvas.width !== w) canvas.width = w;
      if(canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = cssVar("--line-soft", "#1e2740");
      ctx.lineWidth = 1;
      for(let g = 0; g <= 4; g++){
        const y = Math.round(h * (g / 4)) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      const winEl = document.getElementById(opt.windowInputId);
      const windowMs = Math.max(5, parseFloat(winEl ? winEl.value : 30) || 30) * 1000;
      const cutoff = Date.now() - windowMs;
      const shown = frames.filter(f => f.t >= cutoff);
      if(shown.length < 2) return;

      const n = axisCount();
      series.forEach(s => {
        if(s.enabled && !s.enabled()) return;
        const color = s.color.startsWith("--") ? cssVar(s.color, "#3fa9ff") : s.color;
        for(let axis = 0; axis < n; axis++){
          ctx.strokeStyle = color;
          // 軸が多いときは奥の軸ほど薄くして、重なっても手前が読めるようにする
          ctx.globalAlpha = n > 1 ? Math.max(0.35, 1 - axis * 0.15) : 1;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let started = false;
          shown.forEach(f => {
            const arr = f[s.key];
            if(!arr) return;
            const val = arr[axis];
            if(val === undefined) return;
            const x = ((f.t - cutoff) / windowMs) * w;
            const y = h * (1 - Math.min(1, Math.max(0, s.norm(val, axis))));
            if(!started){ ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
          });
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });
    }

    if(opt.intervalMs !== 0) setInterval(draw, opt.intervalMs || 200);

    return {
      push, clear, draw,
      setSeries(s){ series = s; },
      setAxisCount(fn){ axisCount = fn; },
    };
  }

  return { create, cssVar };
})();
