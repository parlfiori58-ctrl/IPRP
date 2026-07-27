const fs = require("node:fs");
const express = require("express");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Non disponibile";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome"
  }).format(date);
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return require("node:crypto").timingSafeEqual(left, right);
}

function baseLayout(title, body, active = "home") {
  const nav = [
    ["home", "/", "Dashboard"],
    ["cittadini", "/cittadini", "Cittadini"],
    ["targhe", "/targhe", "Targhe"]
  ].map(([id, href, label]) =>
    `<a class="${active === id ? "active" : ""}" href="${href}">${label}</a>`
  ).join("");

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${escapeHtml(title)} • Portale FDO IPRP</title>
  <style>
    :root{--bg:#0b1020;--panel:#121a2d;--panel2:#18233a;--line:#273451;--text:#edf3ff;--muted:#9eb0cc;--blue:#4b8cff;--green:#3ccf91;--red:#ff5e6c;--yellow:#f2c94c;--purple:#a66cff}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#142443 0,#0b1020 45%);color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}
    header{position:sticky;top:0;z-index:10;background:rgba(11,16,32,.9);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
    .topbar{max-width:1250px;margin:auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{display:flex;align-items:center;gap:12px;font-weight:800}.badge-logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,var(--blue),var(--purple));display:grid;place-items:center;box-shadow:0 10px 30px rgba(75,140,255,.25)}
    nav{display:flex;gap:8px;flex-wrap:wrap}nav a{color:var(--muted);text-decoration:none;padding:9px 12px;border-radius:9px}nav a:hover,nav a.active{color:#fff;background:var(--panel2)}
    main{max-width:1250px;margin:auto;padding:28px 20px 50px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}.hero h1{margin:0;font-size:clamp(28px,5vw,46px)}.hero p{color:var(--muted);margin:8px 0 0}.pill{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:8px 12px;color:var(--muted);white-space:nowrap}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.card{background:linear-gradient(180deg,rgba(24,35,58,.97),rgba(18,26,45,.97));border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:0 16px 50px rgba(0,0,0,.18)}.span-3{grid-column:span 3}.span-4{grid-column:span 4}.span-6{grid-column:span 6}.span-8{grid-column:span 8}.span-12{grid-column:span 12}
    .stat{font-size:34px;font-weight:800;margin-top:8px}.label{color:var(--muted);font-size:14px}.accent-blue{color:var(--blue)}.accent-green{color:var(--green)}.accent-red{color:var(--red)}.accent-yellow{color:var(--yellow)}
    .bar-list{display:grid;gap:14px}.bar-row{display:grid;grid-template-columns:160px 1fr 70px;align-items:center;gap:12px}.bar-track{height:14px;background:#0c1426;border-radius:999px;overflow:hidden;border:1px solid var(--line)}.bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--purple))}
    form.search{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}input,select{background:#0d1528;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font:inherit;min-width:220px;flex:1}button,.button{border:0;border-radius:10px;padding:12px 16px;background:var(--blue);color:#fff;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:13px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.04em}.status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}.ok{background:rgba(60,207,145,.13);color:var(--green)}.bad{background:rgba(255,94,108,.14);color:var(--red)}.warn{background:rgba(242,201,76,.14);color:var(--yellow)}
    .section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:5px 0 14px}.section-title h2{margin:0}.kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kv div{background:#0d1528;border:1px solid var(--line);padding:12px;border-radius:10px}.kv small{display:block;color:var(--muted);margin-bottom:5px}.empty{color:var(--muted);padding:22px;text-align:center;border:1px dashed var(--line);border-radius:12px}.record{padding:14px;border:1px solid var(--line);border-radius:12px;background:#0d1528;margin-bottom:10px}.record h3{margin:0 0 8px}.record p{margin:5px 0;color:#dbe6fa}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.muted{color:var(--muted)}
    footer{color:var(--muted);text-align:center;padding:25px}
    @media(max-width:850px){.span-3,.span-4,.span-6,.span-8{grid-column:span 12}.hero{align-items:flex-start;flex-direction:column}.bar-row{grid-template-columns:110px 1fr 50px}.topbar{align-items:flex-start;flex-direction:column}.kv{grid-template-columns:1fr}table{display:block;overflow-x:auto}}
  </style>
</head>
<body>
<header><div class="topbar"><div class="brand"><div class="badge-logo">🛡️</div><div>PORTALE FDO<br><span class="muted" style="font-size:12px">IPRP CIVILI</span></div></div><nav>${nav}</nav></div></header>
<main>${body}</main>
<footer>Portale operativo FDO • Dati letti in tempo reale dal database del bot</footer>
</body></html>`;
}

function authMiddleware(req, res, next) {
  const expectedUser = process.env.PORTALE_USER || "fdo";
  const expectedPassword = process.env.PORTALE_PASSWORD;

  if (!expectedPassword) {
    return res.status(503).send(baseLayout(
      "Configurazione richiesta",
      `<div class="card"><h1>Portale non configurato</h1><p>Imposta <span class="mono">PORTALE_PASSWORD</span> nel file <span class="mono">.env</span> e riavvia il bot.</p></div>`
    ));
  }

  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Portale FDO IPRP", charset="UTF-8"');
    return res.status(401).send("Accesso richiesto");
  }

  let credentials;
  try {
    credentials = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    credentials = ":";
  }
  const separator = credentials.indexOf(":");
  const user = separator >= 0 ? credentials.slice(0, separator) : "";
  const password = separator >= 0 ? credentials.slice(separator + 1) : "";

  if (!safeEqual(user, expectedUser) || !safeEqual(password, expectedPassword)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Portale FDO IPRP", charset="UTF-8"');
    return res.status(401).send("Credenziali non valide");
  }
  next();
}

function startFdoPortal({ databaseFile, port = 3000 }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(authMiddleware);

  const readDb = () => {
    try {
      return JSON.parse(fs.readFileSync(databaseFile, "utf8"));
    } catch {
      return { utenti: {}, multe: {}, arresti: {}, targhe: {} };
    }
  };

  app.get("/", (req, res) => {
    const db = readDb();
    const users = Object.values(db.utenti || {});
    const fines = Object.values(db.multe || {});
    const arrests = Object.values(db.arresti || {});
    const vehicles = Object.values(db.targhe || {});
    const citizens = users.filter(u => u.documento).length;
    const licenses = users.filter(u => u.patente).length;
    const pending = fines.filter(f => f.stato !== "PAGATA").length;
    const paid = fines.filter(f => f.stato === "PAGATA").length;
    const max = Math.max(citizens, licenses, fines.length, arrests.length, vehicles.length, 1);
    const rows = [
      ["Cittadini", citizens], ["Patenti", licenses], ["Multe", fines.length], ["Arresti", arrests.length], ["Veicoli", vehicles.length]
    ].map(([label, value]) => `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(value / max * 100)}%"></div></div><strong>${value}</strong></div>`).join("");

    const body = `<div class="hero"><div><h1>Dashboard operativa</h1><p>Panoramica aggiornata in tempo reale degli archivi civili.</p></div><span class="pill">Ultimo aggiornamento: ${formatDate(db.ultimoAggiornamento)}</span></div>
      <div class="grid">
        <div class="card span-3"><div class="label">Cittadini registrati</div><div class="stat accent-blue">${citizens}</div></div>
        <div class="card span-3"><div class="label">Patenti attive</div><div class="stat accent-green">${licenses}</div></div>
        <div class="card span-3"><div class="label">Multe pendenti</div><div class="stat accent-red">${pending}</div></div>
        <div class="card span-3"><div class="label">Multe pagate</div><div class="stat accent-yellow">${paid}</div></div>
        <div class="card span-8"><div class="section-title"><h2>Distribuzione registrazioni</h2></div><div class="bar-list">${rows}</div></div>
        <div class="card span-4"><h2>Ricerca rapida</h2><p class="muted">Cerca per nome, cognome, Roblox, ID Discord oppure targa.</p><form class="search" action="/cittadini"><input name="q" placeholder="Es. Mario Rossi"><button>Cerca</button></form><a class="button" href="/targhe">Controlla una targa</a></div>
      </div>`;
    res.send(baseLayout("Dashboard", body, "home"));
  });

  app.get("/cittadini", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").trim().toLowerCase();
    const entries = Object.entries(db.utenti || {}).filter(([, u]) => {
      if (!u.documento) return false;
      if (!query) return true;
      const haystack = [u.userId, u.documento.nome, u.documento.cognome, u.documento.nomeRoblox, u.documento.cittadinanza].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    const rows = entries.map(([id, u]) => `<tr><td><strong>${escapeHtml(u.documento.nome)} ${escapeHtml(u.documento.cognome)}</strong><br><span class="muted">${escapeHtml(u.documento.nomeRoblox || "-")}</span></td><td class="mono">${escapeHtml(id)}</td><td>${u.patente ? '<span class="status ok">Presente</span>' : '<span class="status bad">Assente</span>'}</td><td>${(u.multe || []).length}</td><td>${(u.fedinaPenale || []).length}</td><td><a class="button" href="/cittadino/${encodeURIComponent(id)}">Apri</a></td></tr>`).join("");

    const body = `<div class="hero"><div><h1>Archivio cittadini</h1><p>Ricerca completa delle persone registrate.</p></div><span class="pill">${entries.length} risultati</span></div>
      <div class="card"><form class="search"><input name="q" value="${escapeHtml(req.query.q || "")}" placeholder="Nome, cognome, Roblox o Discord ID"><button>Cerca</button></form>
      ${rows ? `<table><thead><tr><th>Cittadino</th><th>ID Discord</th><th>Patente</th><th>Multe</th><th>Arresti</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessun cittadino trovato.</div>'}</div>`;
    res.send(baseLayout("Cittadini", body, "cittadini"));
  });

  app.get("/cittadino/:id", (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const user = db.utenti?.[id];
    if (!user?.documento) return res.status(404).send(baseLayout("Non trovato", '<div class="card"><h1>Cittadino non trovato</h1></div>', "cittadini"));

    const d = user.documento;
    const p = user.patente;
    const fines = (user.multe || []).map(fid => db.multe?.[fid]).filter(Boolean);
    const arrests = (user.fedinaPenale || []).map(aid => db.arresti?.[aid]).filter(Boolean);
    const vehicles = (user.auto || []).map(t => db.targhe?.[t]).filter(Boolean);

    const finesHtml = fines.length ? fines.map(f => `<div class="record"><h3>${escapeHtml(f.id)} <span class="status ${f.stato === "PAGATA" ? "ok" : "warn"}">${escapeHtml(f.stato)}</span></h3><p><strong>Reato:</strong> ${escapeHtml(f.reato)}</p><p><strong>Importo:</strong> ${formatMoney(f.importo)} • <strong>Data:</strong> ${formatDate(f.creataIl)}</p><p>${escapeHtml(f.descrizione)}</p></div>`).join("") : '<div class="empty">Nessuna multa registrata.</div>';
    const arrestsHtml = arrests.length ? arrests.map(a => `<div class="record"><h3>${escapeHtml(a.id)}</h3><p><strong>Reati:</strong> ${escapeHtml(a.reati)}</p><p><strong>Registrato:</strong> ${formatDate(a.registratoIl)} • <strong>Agente:</strong> ${escapeHtml(a.firmaAgente)}</p><p>${escapeHtml(a.descrizioneAccaduto)}</p></div>`).join("") : '<div class="empty">Fedina penale pulita.</div>';
    const vehiclesHtml = vehicles.length ? vehicles.map(v => `<div class="record"><h3>${escapeHtml(v.modello)} • <span class="mono">${escapeHtml(v.targa)}</span></h3><p><strong>Colore:</strong> ${escapeHtml(v.colore)} • <strong>Cerchioni:</strong> ${escapeHtml(v.cerchioni)} • <strong>Gancio:</strong> ${v.gancio ? "Presente" : "Assente"}</p><p><strong>Assicurazione:</strong> ${v.assicurazione?.scadenza > Date.now() ? `${escapeHtml(v.assicurazione.piano)} fino al ${formatDate(v.assicurazione.scadenza)}` : "Non assicurata"}</p></div>`).join("") : '<div class="empty">Nessun veicolo intestato.</div>';

    const body = `<div class="hero"><div><h1>${escapeHtml(d.nome)} ${escapeHtml(d.cognome)}</h1><p>Fascicolo completo del cittadino.</p></div><span class="pill mono">${escapeHtml(id)}</span></div>
      <div class="grid">
        <div class="card span-6"><div class="section-title"><h2>Documento</h2><span class="status ok">Approvato</span></div><div class="kv"><div><small>Nome</small>${escapeHtml(d.nome)}</div><div><small>Cognome</small>${escapeHtml(d.cognome)}</div><div><small>Data di nascita</small>${escapeHtml(d.dataNascita)}</div><div><small>Cittadinanza</small>${escapeHtml(d.cittadinanza)}</div><div><small>Roblox</small>${escapeHtml(d.nomeRoblox)}</div><div><small>Approvato il</small>${formatDate(d.approvatoIl)}</div></div></div>
        <div class="card span-6"><div class="section-title"><h2>Patente</h2>${p ? '<span class="status ok">Presente</span>' : '<span class="status bad">Assente</span>'}</div>${p ? `<div class="kv"><div><small>Punti</small>${escapeHtml(p.punti)}/20</div><div><small>Registrata</small>${formatDate(p.registrataIl)}</div><div><small>Stato</small>${p.sequestrataFinoAl > Date.now() ? "Sequestrata" : "Regolare"}</div><div><small>Restituzione</small>${p.sequestrataFinoAl > Date.now() ? formatDate(p.sequestrataFinoAl) : "-"}</div></div>` : '<div class="empty">Nessuna patente.</div>'}</div>
        <div class="card span-4"><h2>Situazione economica</h2><div class="stat">${formatMoney(user.conto?.banca)}</div><div class="label">Saldo bancario</div><hr style="border-color:var(--line);border-width:1px 0 0;margin:15px 0"><strong>${formatMoney(user.conto?.contanti)}</strong> <span class="muted">in contanti</span></div>
        <div class="card span-4"><h2>Multe</h2><div class="stat accent-red">${fines.length}</div><div class="label">${fines.filter(f => f.stato !== "PAGATA").length} ancora da pagare</div></div>
        <div class="card span-4"><h2>Fedina penale</h2><div class="stat accent-yellow">${arrests.length}</div><div class="label">arresti registrati</div></div>
        <div class="card span-12"><div class="section-title"><h2>Multe</h2></div>${finesHtml}</div>
        <div class="card span-12"><div class="section-title"><h2>Casellario penale</h2></div>${arrestsHtml}</div>
        <div class="card span-12"><div class="section-title"><h2>Veicoli intestati</h2></div>${vehiclesHtml}</div>
      </div>`;
    res.send(baseLayout(`${d.nome} ${d.cognome}`, body, "cittadini"));
  });

  app.get("/targhe", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const vehicles = Object.values(db.targhe || {}).filter(v => !query || String(v.targa).includes(query));
    const rows = vehicles.map(v => `<tr><td class="mono">${escapeHtml(v.targa)}</td><td>${escapeHtml(v.modello)}</td><td>${escapeHtml(v.nome)} ${escapeHtml(v.cognome)}</td><td>${v.assicurazione?.scadenza > Date.now() ? '<span class="status ok">Assicurata</span>' : '<span class="status bad">Non assicurata</span>'}</td><td><a class="button" href="/cittadino/${encodeURIComponent(v.userId)}">Intestatario</a></td></tr>`).join("");
    const body = `<div class="hero"><div><h1>Registro targhe</h1><p>Controllo dei veicoli immatricolati.</p></div><span class="pill">${vehicles.length} veicoli</span></div><div class="card"><form class="search"><input name="q" value="${escapeHtml(req.query.q || "")}" placeholder="Inserisci una targa"><button>Controlla</button></form>${rows ? `<table><thead><tr><th>Targa</th><th>Modello</th><th>Intestatario</th><th>Assicurazione</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessuna targa trovata.</div>'}</div>`;
    res.send(baseLayout("Targhe", body, "targhe"));
  });

  app.get("/health", (req, res) => res.json({ ok: true, service: "iprp-portale-fdo" }));

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Portale FDO attivo sulla porta ${port}`);
  });
  return server;
}

module.exports = { startFdoPortal };
