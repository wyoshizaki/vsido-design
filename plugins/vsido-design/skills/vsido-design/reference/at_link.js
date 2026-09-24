/* ============================================================================
   at_link.js — ブリッジ(PowerShell)との通信
   ----------------------------------------------------------------------------
   ブラウザのJSはUDPもCOMポートも直接は触れないので、必ずここを通して
   ローカルのPowerShellブリッジへHTTPで頼む。

   ★設計の要点: 送信と受信を1往復にまとめる。
     PowerShell側のHTTPサーバは1リクエストずつしか処理できないので、
     「送信」と「受信」で別々にリクエストを投げると往復回数が倍になり、
     連続送信の周期が詰まったときに詰まりやすくなる。
     AtLink.send() は送信した応答にそのまま受信パケットを載せて返す。
   ============================================================================ */
"use strict";

const AtLink = (() => {

  async function json(url, opt){
    const r = await fetch(url, opt);
    return await r.json();
  }

  /* 起動時の既定値をブリッジから貰う */
  const config = () => json("/config");

  /* 送信＋受信を1往復で。戻り値 {ok,count,packets:[{ip,port,text}],recv} */
  async function send(text, ip, port){
    let q = "";
    if(ip !== undefined && port !== undefined){
      q = `?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`;
    }
    return await json("/send" + q, { method:"POST", body: text });
  }

  /* 送信せずに受信だけ取り出す */
  const recv = () => json("/recv");

  /* UDP受信ポートの張り替え */
  const relisten = (port) => json("/relisten?port=" + encodeURIComponent(port), { method:"POST" });

  /* 送信経路の切り替え: "udp" / "uart" / "both" */
  const transport = (mode) => json("/transport?mode=" + encodeURIComponent(mode), { method:"POST" });

  /* UART（-EnableSerial のツールのみ） */
  const ports      = () => json("/ports");
  const connect    = (port, baud) =>
    json(`/connect?port=${encodeURIComponent(port)}&baud=${encodeURIComponent(baud)}`, { method:"POST" });
  const disconnect = () => json("/disconnect", { method:"POST" });

  /* --------------------------------------------------------------------
     受信テキストの解析
     --------------------------------------------------------------------
     ファームの電文は「キーワード,値,値,…(軸数ぶん)」の行の集まり。
     機種非依存にしたいので、キーワードを決め打ちせず全部拾って返す。
     戻り値: { agl:[...], obj_agl:[...], vel:[...], cur:[...], ... }
     ★同じキーワードが複数パケットに跨って来ても取りこぼさないよう、
       パケット配列をまとめて渡して1つの表にする。
     -------------------------------------------------------------------- */
  function parsePackets(packets){
    const out = {};
    for(const p of (packets || [])){
      const text = (typeof p === "string") ? p : p.text;
      if(!text) continue;
      for(const ln of text.split(/\r?\n/)){
        const tok = ln.trim().split(/[,:\s]+/).filter(s => s !== "");
        if(tok.length < 2) continue;
        const vals = tok.slice(1).map(Number).filter(v => !isNaN(v));
        if(vals.length === 0) continue;
        out[tok[0]] = vals;   // 後から来た行で上書き（＝そのポーリング周期の最新値）
      }
    }
    return out;
  }

  /* 受信パケットのうち、どの行にも解釈できなかった生テキストを連結して返す
     （イベント行 evt,... や起動メッセージを画面へ出すため） */
  function rawText(packets){
    return (packets || []).map(p => (typeof p === "string") ? p : p.text).join("\n");
  }

  return { config, send, recv, relisten, transport, ports, connect, disconnect,
           parsePackets, rawText };
})();
