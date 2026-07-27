const fs = require("node:fs");
const crypto = require("node:crypto");
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
  return crypto.timingSafeEqual(left, right);
}

function cookieParse(header = "") {
  const result = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function sessionSignature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function createSession(user, secret) {
  const payload = Buffer.from(JSON.stringify({ user, expires: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sessionSignature(payload, secret)}`;
}

function verifySession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (!safeEqual(signature, sessionSignature(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.user || !data.expires || data.expires < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function pageLayout(title, body, active = "dashboard", user = "FDO") {
  const nav = [
    ["dashboard", "/", "Dashboard", "▦"],
    ["cittadini", "/cittadini", "Cittadini", "♙"],
    ["multe", "/multe", "Multe", "▤"],
    ["arresti", "/arresti", "Fedina penale", "⚖"],
    ["targhe", "/targhe", "Veicoli", "◇"]
  ].map(([id, href, label, icon]) => `
    <a class="nav-item ${active === id ? "active" : ""}" href="${href}">
      <span class="nav-icon">${icon}</span><span>${label}</span>
    </a>`).join("");

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#08101f">
  <title>${escapeHtml(title)} • Portale FDO IPRP</title>
  <style>
    :root{
      --bg:#07101f;--bg2:#0a1628;--panel:#101e33;--panel2:#142640;--line:#213a5c;
      --text:#f1f6ff;--muted:#9fb3ce;--blue:#4d98ff;--cyan:#39d6ff;--green:#38d996;
      --red:#ff6674;--yellow:#f7c95d;--purple:#a879ff;--shadow:0 20px 60px rgba(0,0,0,.28)
    }
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;background:
      radial-gradient(circle at 82% -5%,rgba(57,214,255,.15),transparent 27%),
      radial-gradient(circle at 5% 5%,rgba(77,152,255,.18),transparent 30%),
      linear-gradient(145deg,var(--bg),var(--bg2));color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    a{color:inherit}.shell{display:grid;grid-template-columns:255px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;padding:24px 17px;border-right:1px solid var(--line);background:rgba(7,16,31,.88);backdrop-filter:blur(18px);display:flex;flex-direction:column}
    .brand{display:flex;gap:13px;align-items:center;padding:8px 8px 25px}.crest{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:23px;background:linear-gradient(135deg,var(--blue),var(--purple));box-shadow:0 12px 34px rgba(77,152,255,.28)}.brand strong{font-size:16px;letter-spacing:.04em}.brand small{display:block;color:var(--muted);margin-top:3px}
    .nav{display:grid;gap:7px}.nav-item{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--muted);padding:12px 13px;border-radius:12px;border:1px solid transparent;transition:.18s}.nav-item:hover{color:#fff;background:rgba(20,38,64,.75)}.nav-item.active{color:#fff;background:linear-gradient(90deg,rgba(77,152,255,.22),rgba(57,214,255,.07));border-color:rgba(77,152,255,.33)}.nav-icon{width:26px;text-align:center;font-size:18px}
    .sidebar-bottom{margin-top:auto}.userbox{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:13px}.userbox small{color:var(--muted)}.logout{display:block;margin-top:10px;text-decoration:none;color:var(--red);font-size:13px}
    .content{min-width:0;padding:26px 30px 55px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:28px}.topbar h1{font-size:clamp(26px,4vw,43px);margin:0;letter-spacing:-.03em}.topbar p{color:var(--muted);margin:7px 0 0}.live{display:flex;align-items:center;gap:8px;border:1px solid rgba(56,217,150,.28);background:rgba(56,217,150,.08);color:#91f0c6;padding:9px 13px;border-radius:999px;white-space:nowrap}.dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 5px rgba(56,217,150,.11)}
    .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.card{background:linear-gradient(180deg,rgba(20,38,64,.96),rgba(16,30,51,.96));border:1px solid var(--line);border-radius:18px;padding:19px;box-shadow:var(--shadow)}.span-3{grid-column:span 3}.span-4{grid-column:span 4}.span-5{grid-column:span 5}.span-6{grid-column:span 6}.span-7{grid-column:span 7}.span-8{grid-column:span 8}.span-12{grid-column:span 12}
    .stat-card{position:relative;overflow:hidden}.stat-card:after{content:"";position:absolute;width:110px;height:110px;border-radius:50%;right:-35px;top:-38px;background:radial-gradient(circle,rgba(77,152,255,.25),transparent 70%)}.label{color:var(--muted);font-size:13px}.stat{font-size:37px;font-weight:850;margin-top:7px;letter-spacing:-.03em}.accent-blue{color:#80b8ff}.accent-green{color:#74e6b5}.accent-red{color:#ff8c97}.accent-yellow{color:#f8dc8c}.accent-purple{color:#c4a6ff}
    .section-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:15px}.section-head h2{margin:0;font-size:19px}.subtle{color:var(--muted);font-size:13px}.bars{display:grid;gap:15px}.bar-row{display:grid;grid-template-columns:120px minmax(0,1fr) 45px;gap:12px;align-items:center}.track{height:12px;border-radius:999px;background:#071426;border:1px solid var(--line);overflow:hidden}.fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--blue),var(--cyan))}
    .search{display:flex;gap:9px;flex-wrap:wrap}.input,select{min-width:180px;flex:1;background:#09162a;color:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font:inherit;outline:none}.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(77,152,255,.1)}.button,button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;padding:12px 16px;background:linear-gradient(135deg,var(--blue),#3374df);color:white;font-weight:750;text-decoration:none;cursor:pointer;box-shadow:0 10px 24px rgba(77,152,255,.18)}.button.secondary{background:var(--panel2);box-shadow:none;border:1px solid var(--line)}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:13px 10px;border-bottom:1px solid var(--line);vertical-align:middle}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.table-wrap{overflow:auto}.status{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}.ok{color:#7ce8b9;background:rgba(56,217,150,.12)}.bad{color:#ff9da6;background:rgba(255,102,116,.12)}.warn{color:#ffe09b;background:rgba(247,201,93,.12)}
    .kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kv div{border:1px solid var(--line);background:#0a172b;border-radius:12px;padding:12px}.kv small{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}.record{border:1px solid var(--line);background:#0a172b;border-radius:14px;padding:14px;margin-bottom:10px}.record h3{margin:0 0 8px;font-size:16px}.record p{margin:5px 0;color:#dce8f8}.empty{text-align:center;color:var(--muted);padding:28px;border:1px dashed var(--line);border-radius:13px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.mobile-head{display:none}
    .donut{width:160px;height:160px;border-radius:50%;display:grid;place-items:center;margin:auto;background:conic-gradient(var(--green) 0 var(--paid),var(--red) var(--paid) 100%);position:relative}.donut:after{content:"";position:absolute;inset:22px;border-radius:50%;background:var(--panel)}.donut-center{position:relative;z-index:2;text-align:center}.donut-center strong{font-size:27px;display:block}
    @media(max-width:980px){.shell{grid-template-columns:1fr}.sidebar{position:fixed;left:-280px;z-index:50;width:255px;transition:.2s}.sidebar.open{left:0}.content{padding:18px 16px 45px}.mobile-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.menu-btn{background:var(--panel);border:1px solid var(--line);box-shadow:none;padding:9px 12px}.span-3,.span-4,.span-5,.span-6,.span-7,.span-8{grid-column:span 12}.topbar{align-items:flex-start;flex-direction:column}.kv{grid-template-columns:1fr}}
    @media(max-width:560px){.grid{gap:12px}.card{padding:15px;border-radius:15px}.bar-row{grid-template-columns:90px minmax(0,1fr) 35px}.live{font-size:12px}th,td{padding:11px 8px}}
  </style>
</head>
<body>
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><div class="crest">🛡️</div><div><strong>PORTALE FDO</strong><small>IPRP • Centrale operativa</small></div></div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-bottom"><div class="userbox"><small>Sessione attiva</small><strong style="display:block;margin-top:3px">${escapeHtml(user)}</strong><a class="logout" href="/logout">Esci dal portale</a></div></div>
  </aside>
  <main class="content">
    <div class="mobile-head"><strong>🛡️ Portale FDO</strong><button class="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button></div>
    ${body}
  </main>
</div>
</body>
</html>`;
}

function loginPage(message = "") {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07101f"><title>Accesso • Portale FDO IPRP</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 15% 10%,rgba(77,152,255,.24),transparent 32%),radial-gradient(circle at 90% 0,rgba(168,121,255,.18),transparent 30%),#07101f;color:#f1f6ff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.login{width:min(430px,100%);background:linear-gradient(180deg,#142640,#101e33);border:1px solid #213a5c;border-radius:24px;padding:28px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.crest{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;font-size:31px;background:linear-gradient(135deg,#4d98ff,#a879ff);box-shadow:0 16px 38px rgba(77,152,255,.28);margin-bottom:18px}h1{margin:0;font-size:31px;letter-spacing:-.03em}p{color:#9fb3ce;line-height:1.55}.field{margin-top:15px}label{display:block;color:#b8c8dd;font-size:13px;margin-bottom:7px}input{width:100%;border:1px solid #29466e;background:#09162a;color:white;border-radius:13px;padding:13px 14px;font:inherit;outline:none}input:focus{border-color:#4d98ff;box-shadow:0 0 0 3px rgba(77,152,255,.1)}button{width:100%;margin-top:20px;border:0;border-radius:13px;padding:13px;background:linear-gradient(135deg,#4d98ff,#3374df);color:white;font-weight:800;font-size:15px;cursor:pointer}.error{background:rgba(255,102,116,.12);border:1px solid rgba(255,102,116,.3);color:#ffb2b9;padding:10px 12px;border-radius:11px;margin-top:15px}.foot{text-align:center;font-size:12px;color:#7088a9;margin-top:18px}</style></head><body><form class="login" method="post" action="/login"><div class="crest">🛡️</div><h1>Accesso riservato</h1><p>Portale operativo delle Forze dell’Ordine IPRP. Inserisci le credenziali autorizzate.</p>${message ? `<div class="error">${escapeHtml(message)}</div>` : ""}<div class="field"><label>Nome utente</label><input name="username" autocomplete="username" required></div><div class="field"><label>Password</label><input type="password" name="password" autocomplete="current-password" required></div><button type="submit">Accedi al portale</button><div class="foot">Connessione protetta • Archivio sincronizzato con il bot</div></form></body></html>`;
}

function startFdoPortal({ databaseFile, port = 3000 }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));

  const expectedUser = process.env.PORTALE_USER || "fdo";
  const expectedPassword = process.env.PORTALE_PASSWORD || "";
  const sessionSecret = process.env.PORTALE_SECRET || expectedPassword || crypto.randomBytes(32).toString("hex");

  const readDb = () => {
    try {
      return JSON.parse(fs.readFileSync(databaseFile, "utf8"));
    } catch {
      return { utenti: {}, richiesteDocumenti: {}, multe: {}, arresti: {}, targhe: {}, ultimoAggiornamento: null };
    }
  };

  app.get("/health", (req, res) => res.status(200).json({ ok: true, service: "iprp-portale-fdo", time: new Date().toISOString() }));
  app.get("/login", (req, res) => res.send(loginPage()));
  app.post("/login", (req, res) => {
    if (!expectedPassword) return res.status(503).send(loginPage("PORTALE_PASSWORD non è configurata su Render."));
    const username = String(req.body.username || "");
    const password = String(req.body.password || "");
    if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)) {
      return res.status(401).send(loginPage("Credenziali non valide."));
    }
    const token = createSession(username, sessionSecret);
    res.setHeader("Set-Cookie", `iprp_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`);
    return res.redirect("/");
  });
  app.get("/logout", (req, res) => {
    res.setHeader("Set-Cookie", "iprp_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    res.redirect("/login");
  });

  app.use((req, res, next) => {
    const session = verifySession(cookieParse(req.headers.cookie).iprp_session, sessionSecret);
    if (!session) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
    req.portalUser = session.user;
    next();
  });

  app.get("/", (req, res) => {
    const db = readDb();
    const users = Object.values(db.utenti || {});
    const fines = Object.values(db.multe || {});
    const arrests = Object.values(db.arresti || {});
    const vehicles = Object.values(db.targhe || {});
    const citizens = users.filter(user => user.documento).length;
    const licenses = users.filter(user => user.patente).length;
    const pending = fines.filter(fine => fine.stato !== "PAGATA").length;
    const paid = fines.filter(fine => fine.stato === "PAGATA").length;
    const insured = vehicles.filter(vehicle => vehicle.assicurazione?.scadenza > Date.now()).length;
    const max = Math.max(citizens, licenses, fines.length, arrests.length, vehicles.length, 1);
    const paidPercentage = fines.length ? Math.round((paid / fines.length) * 100) : 0;
    const bars = [
      ["Cittadini", citizens], ["Patenti", licenses], ["Multe", fines.length], ["Arresti", arrests.length], ["Veicoli", vehicles.length]
    ].map(([label, value]) => `<div class="bar-row"><span>${label}</span><div class="track"><div class="fill" style="width:${Math.max(3, Math.round(value / max * 100))}%"></div></div><strong>${value}</strong></div>`).join("");

    const recent = [...fines].sort((a,b) => new Date(b.creataIl) - new Date(a.creataIl)).slice(0,5).map(fine => `<div class="record"><h3>${escapeHtml(fine.id)} <span class="status ${fine.stato === "PAGATA" ? "ok" : "warn"}">${escapeHtml(fine.stato)}</span></h3><p><strong>${escapeHtml(fine.nome)} ${escapeHtml(fine.cognome)}</strong> • ${formatMoney(fine.importo)}</p><p class="subtle">${escapeHtml(fine.reato)} • ${formatDate(fine.creataIl)}</p></div>`).join("") || '<div class="empty">Nessuna multa registrata.</div>';

    const body = `<div class="topbar"><div><h1>Dashboard operativa</h1><p>Archivio sincronizzato automaticamente con tutte le registrazioni del bot.</p></div><div class="live"><span class="dot"></span> Sistema online</div></div>
      <div class="grid">
        <div class="card stat-card span-3"><div class="label">Cittadini registrati</div><div class="stat accent-blue">${citizens}</div></div>
        <div class="card stat-card span-3"><div class="label">Patenti presenti</div><div class="stat accent-green">${licenses}</div></div>
        <div class="card stat-card span-3"><div class="label">Multe pendenti</div><div class="stat accent-red">${pending}</div></div>
        <div class="card stat-card span-3"><div class="label">Arresti registrati</div><div class="stat accent-yellow">${arrests.length}</div></div>
        <div class="card span-7"><div class="section-head"><h2>Distribuzione archivi</h2><span class="subtle">Aggiornamento in tempo reale</span></div><div class="bars">${bars}</div></div>
        <div class="card span-5"><div class="section-head"><h2>Stato multe</h2><span class="subtle">${fines.length} totali</span></div><div class="donut" style="--paid:${paidPercentage}%"><div class="donut-center"><strong>${paidPercentage}%</strong><span class="subtle">pagate</span></div></div><div style="display:flex;justify-content:center;gap:17px;margin-top:15px"><span class="status ok">${paid} pagate</span><span class="status warn">${pending} pendenti</span></div></div>
        <div class="card span-8"><div class="section-head"><h2>Ricerca rapida cittadino</h2></div><form class="search" action="/cittadini"><input class="input" name="q" placeholder="Nome, cognome, Roblox o ID Discord"><button>Cerca fascicolo</button></form></div>
        <div class="card span-4"><div class="label">Veicoli assicurati</div><div class="stat accent-purple">${insured}/${vehicles.length}</div><a class="button secondary" href="/targhe" style="margin-top:13px">Apri registro veicoli</a></div>
        <div class="card span-12"><div class="section-head"><h2>Ultime multe registrate</h2><a class="button secondary" href="/multe">Vedi tutte</a></div>${recent}</div>
      </div>`;
    res.send(pageLayout("Dashboard", body, "dashboard", req.portalUser));
  });

  app.get("/cittadini", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").trim().toLowerCase();
    const entries = Object.entries(db.utenti || {}).filter(([, user]) => {
      if (!user.documento) return false;
      if (!query) return true;
      const haystack = [user.userId, user.documento.nome, user.documento.cognome, user.documento.nomeRoblox, user.documento.cittadinanza].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    const rows = entries.map(([id, user]) => `<tr><td><strong>${escapeHtml(user.documento.nome)} ${escapeHtml(user.documento.cognome)}</strong><br><span class="subtle">${escapeHtml(user.documento.nomeRoblox || "-")}</span></td><td class="mono">${escapeHtml(id)}</td><td>${user.patente ? '<span class="status ok">Presente</span>' : '<span class="status bad">Assente</span>'}</td><td>${(user.multe || []).length}</td><td>${(user.fedinaPenale || []).length}</td><td><a class="button" href="/cittadino/${encodeURIComponent(id)}">Apri</a></td></tr>`).join("");
    const body = `<div class="topbar"><div><h1>Archivio cittadini</h1><p>Cerca e consulta il fascicolo completo di ogni cittadino.</p></div><div class="live">${entries.length} risultati</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="Nome, cognome, Roblox o Discord ID"><button>Cerca</button></form><div class="table-wrap" style="margin-top:15px">${rows ? `<table><thead><tr><th>Cittadino</th><th>ID Discord</th><th>Patente</th><th>Multe</th><th>Arresti</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessun cittadino trovato.</div>'}</div></div>`;
    res.send(pageLayout("Cittadini", body, "cittadini", req.portalUser));
  });

  app.get("/cittadino/:id", (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const user = db.utenti?.[id];
    if (!user?.documento) return res.status(404).send(pageLayout("Non trovato", '<div class="card"><h1>Cittadino non trovato</h1><p class="subtle">Il profilo richiesto non esiste o non possiede un documento approvato.</p></div>', "cittadini", req.portalUser));
    const d = user.documento;
    const p = user.patente;
    const fines = (user.multe || []).map(fid => db.multe?.[fid]).filter(Boolean);
    const arrests = (user.fedinaPenale || []).map(aid => db.arresti?.[aid]).filter(Boolean);
    const vehicles = (user.auto || []).map(targa => db.targhe?.[targa]).filter(Boolean);
    const fineCards = fines.length ? fines.map(f => `<div class="record"><h3>${escapeHtml(f.id)} <span class="status ${f.stato === "PAGATA" ? "ok" : "warn"}">${escapeHtml(f.stato)}</span></h3><p><strong>Reato:</strong> ${escapeHtml(f.reato)}</p><p><strong>Importo:</strong> ${formatMoney(f.importo)} • <strong>Data:</strong> ${formatDate(f.creataIl)}</p><p>${escapeHtml(f.descrizione)}</p></div>`).join("") : '<div class="empty">Nessuna multa registrata.</div>';
    const arrestCards = arrests.length ? arrests.map(a => `<div class="record"><h3>${escapeHtml(a.id)}</h3><p><strong>Reati:</strong> ${escapeHtml(a.reati)}</p><p><strong>Registrato:</strong> ${formatDate(a.registratoIl)} • <strong>Agente:</strong> ${escapeHtml(a.firmaAgente)}</p><p>${escapeHtml(a.descrizioneAccaduto)}</p></div>`).join("") : '<div class="empty">Fedina penale pulita.</div>';
    const vehicleCards = vehicles.length ? vehicles.map(v => `<div class="record"><h3>${escapeHtml(v.modello)} • <span class="mono">${escapeHtml(v.targa)}</span></h3><p><strong>Colore:</strong> ${escapeHtml(v.colore)} • <strong>Cerchioni:</strong> ${escapeHtml(v.cerchioni)} • <strong>Gancio:</strong> ${v.gancio ? "Presente" : "Assente"}</p><p><strong>Assicurazione:</strong> ${v.assicurazione?.scadenza > Date.now() ? `${escapeHtml(v.assicurazione.piano)} fino al ${formatDate(v.assicurazione.scadenza)}` : "Non assicurata"}</p></div>`).join("") : '<div class="empty">Nessun veicolo intestato.</div>';
    const body = `<div class="topbar"><div><h1>${escapeHtml(d.nome)} ${escapeHtml(d.cognome)}</h1><p>Fascicolo completo del cittadino.</p></div><div class="live mono">${escapeHtml(id)}</div></div><div class="grid">
      <div class="card span-6"><div class="section-head"><h2>Documento</h2><span class="status ok">Approvato</span></div><div class="kv"><div><small>Nome</small>${escapeHtml(d.nome)}</div><div><small>Cognome</small>${escapeHtml(d.cognome)}</div><div><small>Data di nascita</small>${escapeHtml(d.dataNascita)}</div><div><small>Cittadinanza</small>${escapeHtml(d.cittadinanza)}</div><div><small>Roblox</small>${escapeHtml(d.nomeRoblox)}</div><div><small>Approvato il</small>${formatDate(d.approvatoIl)}</div></div></div>
      <div class="card span-6"><div class="section-head"><h2>Patente</h2>${p ? '<span class="status ok">Presente</span>' : '<span class="status bad">Assente</span>'}</div>${p ? `<div class="kv"><div><small>Punti</small>${escapeHtml(p.punti)}/20</div><div><small>Registrata</small>${formatDate(p.registrataIl)}</div><div><small>Stato</small>${p.sequestrataFinoAl > Date.now() ? "Sequestrata" : "Regolare"}</div><div><small>Restituzione</small>${p.sequestrataFinoAl > Date.now() ? formatDate(p.sequestrataFinoAl) : "-"}</div></div>` : '<div class="empty">Nessuna patente registrata.</div>'}</div>
      <div class="card span-4"><div class="label">Saldo bancario</div><div class="stat accent-green">${formatMoney(user.conto?.banca)}</div><div class="subtle">${formatMoney(user.conto?.contanti)} in contanti</div></div>
      <div class="card span-4"><div class="label">Multe totali</div><div class="stat accent-red">${fines.length}</div><div class="subtle">${fines.filter(f => f.stato !== "PAGATA").length} non pagate</div></div>
      <div class="card span-4"><div class="label">Arresti registrati</div><div class="stat accent-yellow">${arrests.length}</div><div class="subtle">Fedina penale</div></div>
      <div class="card span-12"><div class="section-head"><h2>Multe</h2></div>${fineCards}</div>
      <div class="card span-12"><div class="section-head"><h2>Casellario penale</h2></div>${arrestCards}</div>
      <div class="card span-12"><div class="section-head"><h2>Veicoli intestati</h2></div>${vehicleCards}</div>
    </div>`;
    res.send(pageLayout(`${d.nome} ${d.cognome}`, body, "cittadini", req.portalUser));
  });

  app.get("/multe", (req, res) => {
    const db = readDb();
    const filter = String(req.query.stato || "tutte").toUpperCase();
    const query = String(req.query.q || "").toLowerCase().trim();
    const fines = Object.values(db.multe || {}).filter(f => (filter === "TUTTE" || f.stato === filter) && (!query || `${f.id} ${f.nome} ${f.cognome} ${f.reato}`.toLowerCase().includes(query))).sort((a,b) => new Date(b.creataIl)-new Date(a.creataIl));
    const rows = fines.map(f => `<tr><td class="mono">${escapeHtml(f.id)}</td><td><strong>${escapeHtml(f.nome)} ${escapeHtml(f.cognome)}</strong></td><td>${escapeHtml(f.reato)}</td><td>${formatMoney(f.importo)}</td><td><span class="status ${f.stato === "PAGATA" ? "ok" : "warn"}">${escapeHtml(f.stato)}</span></td><td>${formatDate(f.creataIl)}</td><td><a class="button" href="/cittadino/${encodeURIComponent(f.userId)}">Profilo</a></td></tr>`).join("");
    const body = `<div class="topbar"><div><h1>Registro multe</h1><p>Tutte le sanzioni pagate e pendenti.</p></div><div class="live">${fines.length} risultati</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="ID, cittadino o reato"><select name="stato"><option value="tutte">Tutte</option><option value="PENDENTE" ${filter === "PENDENTE" ? "selected" : ""}>Pendenti</option><option value="PAGATA" ${filter === "PAGATA" ? "selected" : ""}>Pagate</option></select><button>Filtra</button></form><div class="table-wrap" style="margin-top:15px">${rows ? `<table><thead><tr><th>ID</th><th>Cittadino</th><th>Reato</th><th>Importo</th><th>Stato</th><th>Data</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessuna multa trovata.</div>'}</div></div>`;
    res.send(pageLayout("Multe", body, "multe", req.portalUser));
  });

  app.get("/arresti", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").toLowerCase().trim();
    const arrests = Object.values(db.arresti || {}).filter(a => !query || `${a.id} ${a.nomeCognome} ${a.reati} ${a.firmaAgente}`.toLowerCase().includes(query)).sort((a,b)=>new Date(b.registratoIl)-new Date(a.registratoIl));
    const cards = arrests.map(a => `<div class="record"><h3>${escapeHtml(a.id)} • ${escapeHtml(a.nomeCognome)}</h3><p><strong>Reati:</strong> ${escapeHtml(a.reati)}</p><p><strong>Agente:</strong> ${escapeHtml(a.firmaAgente)} • <strong>Data:</strong> ${formatDate(a.registratoIl)}</p><p>${escapeHtml(a.descrizioneAccaduto)}</p><a class="button secondary" href="/cittadino/${encodeURIComponent(a.userId)}">Apri fascicolo</a></div>`).join("") || '<div class="empty">Nessun arresto registrato.</div>';
    const body = `<div class="topbar"><div><h1>Fedina penale</h1><p>Registro completo degli arresti e dei precedenti.</p></div><div class="live">${arrests.length} arresti</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="ID, cittadino, reato o agente"><button>Cerca</button></form><div style="margin-top:16px">${cards}</div></div>`;
    res.send(pageLayout("Fedina penale", body, "arresti", req.portalUser));
  });

  app.get("/targhe", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const vehicles = Object.values(db.targhe || {}).filter(v => !query || String(v.targa).includes(query));
    const rows = vehicles.map(v => `<tr><td class="mono">${escapeHtml(v.targa)}</td><td>${escapeHtml(v.modello)}</td><td>${escapeHtml(v.nome)} ${escapeHtml(v.cognome)}</td><td>${escapeHtml(v.colore)}</td><td>${v.assicurazione?.scadenza > Date.now() ? `<span class="status ok">${escapeHtml(v.assicurazione.piano)}</span>` : '<span class="status bad">Non assicurata</span>'}</td><td><a class="button" href="/cittadino/${encodeURIComponent(v.userId)}">Intestatario</a></td></tr>`).join("");
    const body = `<div class="topbar"><div><h1>Registro veicoli</h1><p>Controllo targhe, intestatari e assicurazioni.</p></div><div class="live">${vehicles.length} veicoli</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="Inserisci una targa"><button>Controlla</button></form><div class="table-wrap" style="margin-top:15px">${rows ? `<table><thead><tr><th>Targa</th><th>Modello</th><th>Intestatario</th><th>Colore</th><th>Assicurazione</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessuna targa trovata.</div>'}</div></div>`;
    res.send(pageLayout("Veicoli", body, "targhe", req.portalUser));
  });

  app.use((req, res) => {
    res.status(404).send(pageLayout("Pagina non trovata", '<div class="card"><h1>Pagina non trovata</h1><p class="subtle">Il collegamento richiesto non esiste. Torna alla dashboard.</p><a class="button" href="/">Dashboard</a></div>', "dashboard", req.portalUser));
  });

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Portale FDO attivo sulla porta ${port}`);
  });
  return server;
}

module.exports = { startFdoPortal };
