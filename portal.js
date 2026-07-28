const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const { EmbedBuilder } = require("discord.js");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function generateRecordId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function sameText(a, b) {
  return String(a ?? "").trim().toLocaleLowerCase("it-IT") === String(b ?? "").trim().toLocaleLowerCase("it-IT");
}

function calculateAge(dateText) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(dateText || ""));
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age--;
  return age;
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

function createFineEmbed(fine, title = "📄 Verbale di contravvenzione") {
  const paid = fine.stato === "PAGATA";
  return new EmbedBuilder()
    .setColor(paid ? 0x57f287 : 0xed4245)
    .setTitle(title)
    .setDescription("Verbale amministrativo registrato nel database civile IPRP.")
    .addFields(
      {
        name: "Informazioni sul sanzionato",
        value: `**Generalità:** ${fine.nome} ${fine.cognome}\n**Utente Discord:** <@${fine.userId}>`,
        inline: false
      },
      {
        name: "Violazione contestata",
        value: `**Reato:** ${String(fine.reato).slice(0, 450)}\n**Descrizione:** ${String(fine.descrizione).slice(0, 550)}`,
        inline: false
      },
      {
        name: "Sanzione pecuniaria",
        value: `**Importo:** ${formatMoney(fine.importo)}\n**Stato:** ${paid ? "✅ PAGATA" : "⏳ PENDENTE"}\n**ID multa:** \`${fine.id}\``,
        inline: false
      },
      {
        name: "Dati dell’agente",
        value: `**Agente:** ${String(fine.agente).slice(0, 300)}\n**Emessa il:** ${formatDate(fine.creataIl)}`,
        inline: false
      }
    )
    .setFooter({ text: "IPRP • Registro sanzioni" })
    .setTimestamp(new Date(fine.creataIl));
}

function createArrestEmbed(arrest, title = "🚔 Registro di arresto") {
  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(title)
    .setDescription("Rapporto di arresto registrato nella fedina penale civile IPRP.")
    .addFields(
      {
        name: "Generalità dell’arrestato",
        value: `**Nome e cognome:** ${String(arrest.nomeCognome).slice(0, 250)}\n**Data di nascita:** ${arrest.dataNascita}\n**Età:** ${arrest.eta}\n**Cittadinanza:** ${String(arrest.cittadinanza).slice(0, 150)}\n**Città di residenza:** ${String(arrest.cittaResidenza).slice(0, 200)}\n**Numero di telefono:** ${String(arrest.numeroTelefono).slice(0, 250)}\n**Utente Discord:** <@${arrest.userId}>`,
        inline: false
      },
      {
        name: "Informazioni sull’arresto",
        value: `**Data dell’accaduto:** ${String(arrest.data).slice(0, 100)}\n**Reati:** ${String(arrest.reati).slice(0, 500)}\n**Descrizione:** ${String(arrest.descrizioneAccaduto).slice(0, 650)}`,
        inline: false
      },
      {
        name: "Dati dell’agente",
        value: `**Firma:** ${String(arrest.firmaAgente).slice(0, 300)}\n**ID arresto:** \`${arrest.id}\`\n**Registrato il:** ${formatDate(arrest.registratoIl)}`,
        inline: false
      }
    )
    .setFooter({ text: "IPRP • Fedina penale" })
    .setTimestamp(new Date(arrest.registratoIl));
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
    ["dashboard", "/", "Quadro operativo", "▦"],
    ["cittadini", "/cittadini", "Anagrafe cittadini", "◉"],
    ["multe", "/multe", "Registro sanzioni", "▤"],
    ["arresti", "/arresti", "Casellario", "⚖"],
    ["targhe", "/targhe", "Archivio veicoli", "◇"]
  ].map(([id, href, label, icon]) => `
    <a class="nav-item ${active === id ? "active" : ""}" href="${href}">
      <span class="nav-icon">${icon}</span><span>${label}</span>
    </a>`).join("");

  const now = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Rome"
  }).format(new Date());

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#08162a">
  <title>${escapeHtml(title)} | Sistema Informativo IPRP</title>
  <style>
    :root{
      --navy:#071426;--navy2:#0b1c32;--navy3:#102744;--blue:#1f5f9d;--blue2:#2f78b7;
      --paper:#f4f7fa;--white:#ffffff;--ink:#172334;--muted:#68798e;--line:#d8e0e8;
      --green:#237a57;--red:#a9363e;--amber:#9b6a15;--shadow:0 8px 24px rgba(20,39,65,.10)
    }
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;background:var(--paper);color:var(--ink);font-family:"Segoe UI",Inter,Arial,sans-serif;font-size:14px}
    a{color:inherit}.shell{display:grid;grid-template-columns:268px minmax(0,1fr);min-height:100vh}
    .sidebar{position:sticky;top:0;height:100vh;background:var(--navy);color:#fff;border-right:1px solid #18314d;display:flex;flex-direction:column}
    .agency-strip{height:7px;background:linear-gradient(90deg,#1d6b3f 0 33%,#f5f5f5 33% 66%,#a52e35 66%)}
    .brand{padding:25px 22px 21px;border-bottom:1px solid rgba(255,255,255,.10);display:flex;align-items:center;gap:14px}
    .crest{width:52px;height:52px;border:1px solid rgba(255,255,255,.34);border-radius:4px;display:grid;place-items:center;font-size:14px;font-weight:800;letter-spacing:.08em;background:#0d223a;box-shadow:inset 0 0 0 3px rgba(255,255,255,.04)}
    .brand strong{font-size:15px;letter-spacing:.08em}.brand small{display:block;color:#9fb1c5;font-size:11px;margin-top:4px;line-height:1.35}
    .classification{margin:16px 18px 8px;border:1px solid rgba(255,255,255,.14);padding:9px 11px;color:#c8d5e3;font-size:10px;letter-spacing:.14em;text-transform:uppercase;text-align:center;background:rgba(255,255,255,.035)}
    .nav{padding:8px 12px;display:grid;gap:3px}.nav-item{display:flex;align-items:center;gap:11px;text-decoration:none;color:#c0cedd;padding:12px 13px;border-left:3px solid transparent;transition:.15s;background:transparent}
    .nav-item:hover{background:rgba(255,255,255,.055);color:#fff}.nav-item.active{background:#102b49;color:#fff;border-left-color:#75aee0}.nav-icon{width:24px;text-align:center;font-size:16px}
    .sidebar-bottom{margin-top:auto;padding:16px 18px 20px;border-top:1px solid rgba(255,255,255,.10)}.userbox small{display:block;color:#91a7bd;font-size:10px;text-transform:uppercase;letter-spacing:.1em}.userbox strong{display:block;margin-top:5px;font-size:14px}.logout{display:inline-block;margin-top:12px;color:#f0a1a6;font-size:12px;text-decoration:none}
    .content{min-width:0;padding:0 0 50px}.institutional-head{height:60px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 30px;position:sticky;top:0;z-index:20}
    .institutional-head .system{font-size:12px;color:#43566d;text-transform:uppercase;letter-spacing:.08em;font-weight:700}.institutional-head .meta{font-size:12px;color:var(--muted);text-align:right}.page-wrap{padding:27px 30px 50px;max-width:1550px;margin:0 auto}
    .topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--line)}.topbar h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(27px,3vw,38px);font-weight:600;margin:0;color:#12233a;letter-spacing:-.015em}.topbar p{color:var(--muted);margin:7px 0 0}.live{display:flex;align-items:center;gap:8px;border:1px solid #bdd7c9;background:#f1f8f4;color:#245f45;padding:8px 12px;border-radius:3px;white-space:nowrap;font-size:12px;font-weight:600}.dot{width:7px;height:7px;border-radius:50%;background:#2f8a63}
    .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.card{background:var(--white);border:1px solid var(--line);border-radius:4px;padding:20px;box-shadow:var(--shadow)}.span-3{grid-column:span 3}.span-4{grid-column:span 4}.span-5{grid-column:span 5}.span-6{grid-column:span 6}.span-7{grid-column:span 7}.span-8{grid-column:span 8}.span-12{grid-column:span 12}
    .stat-card{position:relative;border-top:3px solid var(--blue)}.stat-card:before{content:"";position:absolute;right:16px;top:15px;width:34px;height:34px;border:1px solid #dce6ef;background:#f6f9fc}.label{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.075em;font-weight:700}.stat{font-family:Georgia,"Times New Roman",serif;font-size:36px;font-weight:600;margin-top:10px;color:#12233a}.accent-blue,.accent-green,.accent-red,.accent-yellow,.accent-purple{color:#12233a}
    .section-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:15px;padding-bottom:11px;border-bottom:1px solid var(--line)}.section-head h2{margin:0;font-size:16px;color:#1a2c43}.subtle{color:var(--muted);font-size:12px}.bars{display:grid;gap:14px}.bar-row{display:grid;grid-template-columns:130px minmax(0,1fr) 45px;gap:12px;align-items:center}.track{height:9px;background:#e7edf3;border:1px solid #d6e0e9;overflow:hidden}.fill{height:100%;background:#2b6da8}
    .search{display:flex;gap:9px;flex-wrap:wrap}.input,select,textarea{min-width:180px;flex:1;background:#fff;color:var(--ink);border:1px solid #bfcbd7;border-radius:3px;padding:11px 12px;font:inherit;outline:none}.input:focus,select:focus,textarea:focus{border-color:#2f6fa7;box-shadow:0 0 0 2px rgba(47,111,167,.12)}
    .button,button{display:inline-flex;align-items:center;justify-content:center;border:1px solid #1d4f7d;border-radius:3px;padding:10px 15px;background:#225f96;color:white;font-weight:700;text-decoration:none;cursor:pointer;font-size:13px}.button:hover,button:hover{background:#194d7a}.button.secondary{background:#fff;color:#25435f;border-color:#aebbc8}.button.danger{background:#8f3037;border-color:#74252b}.button.success{background:#286c4e;border-color:#1f573e}.actions{display:flex;gap:9px;flex-wrap:wrap}
    .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.field{display:grid;gap:6px}.field.full{grid-column:1/-1}.field label{font-size:11px;color:#52657a;text-transform:uppercase;letter-spacing:.07em;font-weight:700}.field textarea{min-height:115px;resize:vertical}.notice{padding:12px 14px;border-left:4px solid #2b7657;background:#f0f7f3;color:#285840;margin-bottom:16px}.notice.error{border-left-color:#a9363e;background:#fbf1f2;color:#783039}
    table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #e0e6ec;vertical-align:middle}th{color:#4f6174;font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:#f4f7fa;border-top:1px solid #e0e6ec}.table-wrap{overflow:auto}.status{display:inline-flex;align-items:center;padding:4px 8px;border-radius:2px;font-size:10px;font-weight:800;white-space:nowrap;text-transform:uppercase;letter-spacing:.04em}.ok{color:#1f6548;background:#e6f3ec;border:1px solid #c4dfd0}.bad{color:#863039;background:#f8e9eb;border:1px solid #e8c5c9}.warn{color:#795515;background:#f8f0de;border:1px solid #e8d6ae}
    .kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kv div{border:1px solid var(--line);background:#f8fafc;padding:12px}.kv small{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.065em;margin-bottom:5px;font-weight:700}.record{border:1px solid var(--line);background:#fff;padding:15px;margin-bottom:10px;border-left:4px solid #315f8a}.record h3{margin:0 0 8px;font-size:15px}.record p{margin:5px 0;color:#3d4e61}.empty{text-align:center;color:var(--muted);padding:30px;border:1px dashed #bfcbd7;background:#fafbfd}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.mobile-head{display:none}
    .donut{width:154px;height:154px;border-radius:50%;display:grid;place-items:center;margin:auto;background:conic-gradient(#2c7455 0 var(--paid),#a83c45 var(--paid) 100%);position:relative}.donut:after{content:"";position:absolute;inset:23px;border-radius:50%;background:#fff}.donut-center{position:relative;z-index:2;text-align:center}.donut-center strong{font-size:26px;display:block;color:#1a2b3f}
    .footer-note{margin-top:25px;color:#7c8c9e;font-size:10px;text-align:center;text-transform:uppercase;letter-spacing:.08em}
    @media(max-width:980px){.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.shell{grid-template-columns:1fr}.sidebar{position:fixed;left:-285px;z-index:50;width:268px;transition:.2s}.sidebar.open{left:0}.institutional-head{display:none}.page-wrap{padding:18px 15px 40px}.mobile-head{display:flex;align-items:center;justify-content:space-between;background:#fff;border-bottom:1px solid var(--line);padding:13px 15px;margin:-18px -15px 18px}.menu-btn{background:#fff;color:#1f3853;border:1px solid #aebbc8;padding:7px 11px}.span-3,.span-4,.span-5,.span-6,.span-7,.span-8{grid-column:span 12}.topbar{align-items:flex-start;flex-direction:column}.kv{grid-template-columns:1fr}}
    @media(max-width:560px){.grid{gap:11px}.card{padding:15px}.bar-row{grid-template-columns:90px minmax(0,1fr) 35px}.live{font-size:11px}th,td{padding:10px 8px}}
  </style>
</head>
<body>
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <div class="agency-strip"></div>
    <div class="brand"><div class="crest">IPRP</div><div><strong>SISTEMA FDO</strong><small>Portale operativo riservato<br>Archivio amministrativo</small></div></div>
    <div class="classification">Uso interno • Riservato</div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-bottom"><div class="userbox"><small>Operatore autenticato</small><strong>${escapeHtml(user)}</strong><a class="logout" href="/logout">Termina sessione</a></div></div>
  </aside>
  <main class="content">
    <header class="institutional-head"><div class="system">IPRP — Sistema informativo delle Forze dell’Ordine</div><div class="meta">${escapeHtml(now)}<br>Sessione protetta</div></header>
    <div class="page-wrap">
      <div class="mobile-head"><strong>Sistema FDO IPRP</strong><button class="menu-btn" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button></div>
      ${body}
      <div class="footer-note">Sistema riservato agli operatori autorizzati • Le operazioni sono registrate</div>
    </div>
  </main>
</div>
</body>
</html>`;
}

function loginPage(message = "") {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#071426">
<title>Accesso riservato | Sistema FDO IPRP</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#eef2f6;color:#172334;font-family:"Segoe UI",Arial,sans-serif;display:grid;grid-template-rows:7px 1fr}.flag{background:linear-gradient(90deg,#17613c 0 33%,#f8f8f8 33% 66%,#9d2931 66%)}.screen{display:grid;grid-template-columns:minmax(300px,540px) minmax(360px,1fr);min-height:calc(100vh - 7px)}.left{background:#071426;color:white;padding:clamp(34px,6vw,78px);display:flex;flex-direction:column;justify-content:space-between}.seal{width:88px;height:88px;border:2px solid rgba(255,255,255,.5);display:grid;place-items:center;font-weight:800;letter-spacing:.12em;background:#0c2139;box-shadow:inset 0 0 0 6px rgba(255,255,255,.04)}.left h1{font-family:Georgia,"Times New Roman",serif;font-weight:500;font-size:clamp(36px,5vw,61px);line-height:1.05;margin:34px 0 17px}.left p{color:#b9c8d7;line-height:1.65;max-width:430px}.restricted{border-top:1px solid rgba(255,255,255,.16);padding-top:18px;font-size:10px;text-transform:uppercase;letter-spacing:.13em;color:#91a7bd}.right{display:grid;place-items:center;padding:28px}.login{width:min(430px,100%);background:#fff;border:1px solid #d5dee7;padding:32px;box-shadow:0 15px 45px rgba(26,48,75,.12)}.login .eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#5f7184;font-weight:700}.login h2{font-family:Georgia,"Times New Roman",serif;font-size:29px;font-weight:500;margin:9px 0 8px}.login .intro{color:#68798e;line-height:1.55;margin:0 0 23px}.field{margin-top:14px}label{display:block;color:#40546a;font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;margin-bottom:7px}input{width:100%;border:1px solid #b9c6d2;background:#fff;color:#172334;padding:12px 13px;font:inherit;outline:none}input:focus{border-color:#2b6599;box-shadow:0 0 0 2px rgba(43,101,153,.12)}button{width:100%;margin-top:20px;border:1px solid #174b77;padding:12px;background:#225f96;color:white;font-weight:700;font-size:13px;cursor:pointer}button:hover{background:#194d7a}.error{background:#fbf0f1;border-left:4px solid #a9363e;color:#783039;padding:11px 12px;margin-bottom:16px}.foot{font-size:10px;color:#8190a0;margin-top:18px;text-align:center;text-transform:uppercase;letter-spacing:.06em}.secure{display:flex;align-items:center;gap:8px;margin-top:18px;color:#66798d;font-size:11px}.secure:before{content:"";width:7px;height:7px;border-radius:50%;background:#2f7e5b}
@media(max-width:850px){.screen{grid-template-columns:1fr}.left{min-height:270px;padding:32px}.left h1{font-size:36px;margin:22px 0 10px}.restricted{display:none}.right{padding:18px}.login{padding:25px}}
</style></head>
<body><div class="flag"></div><div class="screen"><section class="left"><div><div class="seal">IPRP</div><h1>Sistema Informativo FDO</h1><p>Accesso al portale operativo per la consultazione dei fascicoli anagrafici, dei registri amministrativi e del casellario.</p></div><div class="restricted">Sistema riservato • Accessi e operazioni soggetti a registrazione</div></section><section class="right"><form class="login" method="post" action="/login"><div class="eyebrow">Area operatori autorizzati</div><h2>Autenticazione</h2><p class="intro">Inserire le credenziali assegnate per accedere al sistema.</p>${message ? `<div class="error">${escapeHtml(message)}</div>` : ""}<div class="field"><label>Identificativo operatore</label><input name="username" autocomplete="username" required autofocus></div><div class="field"><label>Credenziale di accesso</label><input type="password" name="password" autocomplete="current-password" required></div><button type="submit">Accedi al sistema</button><div class="secure">Connessione protetta e sessione temporanea</div><div class="foot">IPRP • Portale operativo FDO</div></form></section></div></body></html>`;
}

function startFdoPortal({ databaseFile, port = 3000, client = null, arrestsChannelId = null }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));

  const expectedUser = process.env.PORTALE_USER || "fdo";
  const expectedPassword = process.env.PORTALE_PASSWORD || "";
  const sessionSecret = process.env.PORTALE_SECRET || expectedPassword || crypto.randomBytes(32).toString("hex");

  const operationsDir = path.join(path.dirname(databaseFile), "operazioni-elaborate");

  const claimOperation = operationId => {
    if (!operationId || !/^[a-zA-Z0-9_-]{12,100}$/.test(String(operationId))) return false;
    try {
      fs.mkdirSync(operationsDir, { recursive: true });
      const name = crypto.createHash("sha256").update(`portale:${operationId}`).digest("hex");
      const file = path.join(operationsDir, `${name}.lock`);
      const fd = fs.openSync(file, "wx");
      fs.writeFileSync(fd, JSON.stringify({ operationId, createdAt: new Date().toISOString() }), "utf8");
      fs.closeSync(fd);
      return true;
    } catch (error) {
      if (error?.code === "EEXIST") return false;
      console.error("Errore controllo duplicati portale:", error);
      return false;
    }
  };

  const readDb = () => {
    try {
      const db = JSON.parse(fs.readFileSync(databaseFile, "utf8"));
      db.utenti ||= {};
      db.richiesteDocumenti ||= {};
      db.multe ||= {};
      db.arresti ||= {};
      db.targhe ||= {};
      return db;
    } catch {
      return { utenti: {}, richiesteDocumenti: {}, multe: {}, arresti: {}, targhe: {}, ultimoAggiornamento: null };
    }
  };

  const writeDb = (db, reason = "portale") => {
    db.ultimoAggiornamento = new Date().toISOString();

    const dataDir = path.dirname(databaseFile);
    const temp = path.join(dataDir, "iprp_civili.portal.tmp.json");
    const previous = path.join(dataDir, "iprp_civili.previous.json");
    const backupDir = path.join(dataDir, "backups");

    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });

    if (fs.existsSync(databaseFile)) {
      try {
        fs.copyFileSync(databaseFile, previous);
      } catch {}
    }

    fs.writeFileSync(temp, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(temp, databaseFile);

    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backup = path.join(backupDir, `iprp_civili-${stamp}-${reason}.json`);
      fs.copyFileSync(databaseFile, backup);

      const files = fs.readdirSync(backupDir)
        .filter(name => name.startsWith("iprp_civili-") && name.endsWith(".json"))
        .map(name => path.join(backupDir, name))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

      for (const file of files.slice(30)) fs.unlinkSync(file);
    } catch {}
  };

  const sendDirectMessage = async (userId, payload) => {
    if (!client) return;
    try {
      const user = await client.users.fetch(userId);
      await user.send(payload);
    } catch {}
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

    const body = `<div class="topbar"><div><h1>Dashboard operativa</h1><p>Sintesi dei registri e delle attività presenti nel sistema.</p></div><div class="live"><span class="dot"></span> Sistema operativo</div></div>
      <div class="grid">
        <div class="card stat-card span-3"><div class="label">Cittadini registrati</div><div class="stat accent-blue">${citizens}</div></div>
        <div class="card stat-card span-3"><div class="label">Patenti presenti</div><div class="stat accent-green">${licenses}</div></div>
        <div class="card stat-card span-3"><div class="label">Multe pendenti</div><div class="stat accent-red">${pending}</div></div>
        <div class="card stat-card span-3"><div class="label">Arresti registrati</div><div class="stat accent-yellow">${arrests.length}</div></div>
        <div class="card span-7"><div class="section-head"><h2>Consistenza degli archivi</h2><span class="subtle">Dati correnti</span></div><div class="bars">${bars}</div></div>
        <div class="card span-5"><div class="section-head"><h2>Stato multe</h2><span class="subtle">${fines.length} totali</span></div><div class="donut" style="--paid:${paidPercentage}%"><div class="donut-center"><strong>${paidPercentage}%</strong><span class="subtle">pagate</span></div></div><div style="display:flex;justify-content:center;gap:17px;margin-top:15px"><span class="status ok">${paid} pagate</span><span class="status warn">${pending} pendenti</span></div></div>
        <div class="card span-8"><div class="section-head"><h2>Consultazione fascicolo cittadino</h2></div><form class="search" action="/cittadini"><input class="input" name="q" placeholder="Nome, cognome, Roblox o ID Discord"><button>Cerca fascicolo</button></form></div>
        <div class="card span-4"><div class="label">Veicoli assicurati</div><div class="stat accent-purple">${insured}/${vehicles.length}</div><a class="button secondary" href="/targhe" style="margin-top:13px">Apri registro veicoli</a></div>
        <div class="card span-12"><div class="section-head"><h2>Ultimi verbali registrati</h2><a class="button secondary" href="/multe">Vedi tutte</a></div>${recent}</div>
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
    const body = `<div class="topbar"><div><h1>Archivio cittadini</h1><p>Ricerca anagrafica e consultazione del fascicolo individuale.</p></div><div class="live">${entries.length} risultati</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="Nome, cognome, Roblox o Discord ID"><button>Cerca</button></form><div class="table-wrap" style="margin-top:15px">${rows ? `<table><thead><tr><th>Cittadino</th><th>ID Discord</th><th>Patente</th><th>Multe</th><th>Arresti</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessun cittadino trovato.</div>'}</div></div>`;
    res.send(pageLayout("Cittadini", body, "cittadini", req.portalUser));
  });

  app.get("/cittadino/:id/multa", (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const user = db.utenti?.[id];
    if (!user?.documento) return res.status(404).send(pageLayout("Cittadino non trovato", '<div class="card"><h1>Cittadino non trovato</h1></div>', "cittadini", req.portalUser));
    const d = user.documento;
    const operationId = crypto.randomUUID().replaceAll("-", "");
    const body = `<div class="topbar"><div><h1>Nuovo verbale di multa</h1><p>Registrazione amministrativa per ${escapeHtml(d.nome)} ${escapeHtml(d.cognome)}.</p></div><a class="button secondary" href="/cittadino/${encodeURIComponent(id)}">Torna al fascicolo</a></div>
      <div class="card"><form method="post" class="form-grid" onsubmit="const b=this.querySelector('button[type=submit]');b.disabled=true;b.textContent='Registrazione in corso…';">
        <input type="hidden" name="operationId" value="${operationId}">
        <div class="field"><label>Utente Discord</label><input class="input mono" value="${escapeHtml(id)}" disabled></div>
        <div class="field"><label>Nome</label><input class="input" name="nome" value="${escapeHtml(d.nome)}" required></div>
        <div class="field"><label>Cognome</label><input class="input" name="cognome" value="${escapeHtml(d.cognome)}" required></div>
        <div class="field full"><label>Reato / violazione</label><input class="input" name="reato" maxlength="500" required></div>
        <div class="field"><label>Importo (€)</label><input class="input" type="number" min="1" max="100000000" name="importo" required></div>
        <div class="field"><label>Agente operante</label><input class="input" name="agente" maxlength="200" required></div>
        <div class="field full"><label>Descrizione dei fatti</label><textarea name="descrizione" maxlength="1000" required></textarea></div>
        <div class="field full"><button type="submit">Registra la multa</button></div>
      </form></div>`;
    res.send(pageLayout("Nuova multa", body, "multe", req.portalUser));
  });

  app.post("/cittadino/:id/multa", async (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const user = db.utenti?.[id];
    if (!user?.documento) return res.status(404).send("Cittadino non trovato");
    const d = user.documento;
    const nome = String(req.body.nome || "").trim();
    const cognome = String(req.body.cognome || "").trim();
    const importo = Number(req.body.importo);
    if (!sameText(nome, d.nome) || !sameText(cognome, d.cognome) || !Number.isFinite(importo) || importo < 1) {
      return res.status(400).send(pageLayout("Dati non validi", '<div class="card"><div class="notice error">I dati inseriti non corrispondono al documento oppure l’importo non è valido.</div><a class="button" href="/cittadino/'+encodeURIComponent(id)+'/multa">Torna al modulo</a></div>', "multe", req.portalUser));
    }
    const operationId = String(req.body.operationId || "");
    if (!claimOperation(`multa-${operationId}`)) {
      return res.redirect(`/cittadino/${encodeURIComponent(id)}?esito=duplicato`);
    }

    const fine = {
      id: generateRecordId("MUL"), userId: id, nome: d.nome, cognome: d.cognome,
      reato: String(req.body.reato || "").trim(), importo,
      descrizione: String(req.body.descrizione || "").trim(), agente: String(req.body.agente || "").trim(),
      agentePortale: req.portalUser, origine: "PORTALE_FDO", stato: "PENDENTE", creataIl: new Date().toISOString(), pagataIl: null
    };
    db.multe[fine.id] = fine;
    user.multe ||= [];
    user.multe.push(fine.id);
    writeDb(db, "multa-portale");
    await sendDirectMessage(id, {
      content: `Hai ricevuto una multa. Per pagarla usa \`/paga-multa\` con ID \`${fine.id}\`.`,
      embeds: [createFineEmbed(fine)]
    });
    res.redirect(`/cittadino/${encodeURIComponent(id)}?esito=multa`);
  });

  app.get("/cittadino/:id/arresto", (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const user = db.utenti?.[id];
    if (!user?.documento) return res.status(404).send(pageLayout("Cittadino non trovato", '<div class="card"><h1>Cittadino non trovato</h1></div>', "cittadini", req.portalUser));
    const d = user.documento;
    const age = calculateAge(d.dataNascita);
    const operationId = crypto.randomUUID().replaceAll("-", "");
    const body = `<div class="topbar"><div><h1>Registrazione arresto</h1><p>Inserimento nel casellario di ${escapeHtml(d.nome)} ${escapeHtml(d.cognome)}.</p></div><a class="button secondary" href="/cittadino/${encodeURIComponent(id)}">Torna al fascicolo</a></div>
      <div class="card"><form method="post" class="form-grid" onsubmit="const b=this.querySelector('button[type=submit]');b.disabled=true;b.textContent='Registrazione in corso…';">
        <input type="hidden" name="operationId" value="${operationId}">
        <div class="field"><label>Utente arrestato (Discord)</label><input class="input mono" value="${escapeHtml(id)}" disabled></div>
        <div class="field"><label>Nome</label><input class="input" name="nome" value="${escapeHtml(d.nome)}" required></div>
        <div class="field"><label>Cognome</label><input class="input" name="cognome" value="${escapeHtml(d.cognome)}" required></div>
        <div class="field"><label>Data di nascita</label><input class="input" name="dataNascita" value="${escapeHtml(d.dataNascita)}" required></div>
        <div class="field"><label>Cittadinanza</label><input class="input" name="cittadinanza" value="${escapeHtml(d.cittadinanza)}" required></div>
        <div class="field"><label>Città di residenza</label><input class="input" name="cittaResidenza" maxlength="100" required></div>
        <div class="field"><label>Età</label><input class="input" type="number" name="eta" value="${escapeHtml(age)}" min="0" max="150" required></div>
        <div class="field"><label>Numero di telefono</label><input class="input" name="numeroTelefono" maxlength="100" required></div>
        <div class="field full"><label>Reati contestati</label><textarea name="reati" maxlength="1000" required></textarea></div>
        <div class="field full"><label>Descrizione dell’accaduto</label><textarea name="descrizioneAccaduto" maxlength="1000" required></textarea></div>
        <div class="field full"><label>Firma agente</label><input class="input" name="firmaAgente" maxlength="200" required></div>
        <div class="field full"><button type="submit">Registra l’arresto</button></div>
      </form></div>`;
    res.send(pageLayout("Nuovo arresto", body, "arresti", req.portalUser));
  });

  app.post("/cittadino/:id/arresto", async (req, res) => {
    const db = readDb();
    const id = req.params.id;
    const user = db.utenti?.[id];
    if (!user?.documento) return res.status(404).send("Cittadino non trovato");
    const d = user.documento;
    const age = calculateAge(d.dataNascita);
    const valid = sameText(req.body.nome, d.nome) && sameText(req.body.cognome, d.cognome) && sameText(req.body.dataNascita, d.dataNascita) && sameText(req.body.cittadinanza, d.cittadinanza) && Number(req.body.eta) === age;
    if (!valid) return res.status(400).send(pageLayout("Dati non validi", '<div class="card"><div class="notice error">Le generalità non corrispondono al documento del cittadino.</div><a class="button" href="/cittadino/'+encodeURIComponent(id)+'/arresto">Torna al modulo</a></div>', "arresti", req.portalUser));
    const operationId = String(req.body.operationId || "");
    if (!claimOperation(`arresto-${operationId}`)) {
      return res.redirect(`/cittadino/${encodeURIComponent(id)}?esito=duplicato`);
    }

    const now = Date.now();
    const arrest = {
      id: generateRecordId("ARR"), userId: id, nome: d.nome, cognome: d.cognome, nomeCognome: `${d.nome} ${d.cognome}`,
      dataNascita: d.dataNascita, cittadinanza: d.cittadinanza,
      cittaResidenza: String(req.body.cittaResidenza || "").trim(), eta: age,
      numeroTelefono: String(req.body.numeroTelefono || "").trim(), reati: String(req.body.reati || "").trim(),
      descrizioneAccaduto: String(req.body.descrizioneAccaduto || "").trim(), firmaAgente: String(req.body.firmaAgente || "").trim(),
      agentePortale: req.portalUser, origine: "PORTALE_FDO", data: formatDate(now), dataEventoTimestamp: now,
      registratoIl: new Date(now).toISOString(), registratoTimestamp: now
    };
    db.arresti[arrest.id] = arrest;
    user.fedinaPenale ||= [];
    user.fedinaPenale.push(arrest.id);
    writeDb(db, "arresto-portale");
    await sendDirectMessage(id, {
      content: "È stato registrato un arresto nella tua fedina penale.",
      embeds: [createArrestEmbed(arrest)]
    });
    if (client && arrestsChannelId) {
      try {
        const channel = await client.channels.fetch(arrestsChannelId);
        if (channel?.isTextBased()) {
          await channel.send({
            content: `Nuovo arresto registrato per <@${id}>.`,
            embeds: [createArrestEmbed(arrest)]
          });
        }
      } catch {}
    }
    res.redirect(`/cittadino/${encodeURIComponent(id)}?esito=arresto`);
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
    const notice = req.query.esito === "multa"
      ? '<div class="notice">Multa registrata correttamente.</div>'
      : req.query.esito === "arresto"
        ? '<div class="notice">Arresto registrato correttamente.</div>'
        : req.query.esito === "duplicato"
          ? '<div class="notice">La richiesta era già stata elaborata. Non è stata creata una seconda registrazione.</div>'
          : '';
    const body = `<div class="topbar"><div><h1>${escapeHtml(d.nome)} ${escapeHtml(d.cognome)}</h1><p>Fascicolo anagrafico e operativo.</p></div><div class="actions"><a class="button" href="/cittadino/${encodeURIComponent(id)}/multa">Registra multa</a><a class="button danger" href="/cittadino/${encodeURIComponent(id)}/arresto">Registra arresto</a></div></div>${notice}<div class="grid">
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
    const body = `<div class="topbar"><div><h1>Registro multe</h1><p>Consultazione delle sanzioni amministrative registrate.</p></div><div class="live">${fines.length} risultati</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="ID, cittadino o reato"><select name="stato"><option value="tutte">Tutte</option><option value="PENDENTE" ${filter === "PENDENTE" ? "selected" : ""}>Pendenti</option><option value="PAGATA" ${filter === "PAGATA" ? "selected" : ""}>Pagate</option></select><button>Filtra</button></form><div class="table-wrap" style="margin-top:15px">${rows ? `<table><thead><tr><th>ID</th><th>Cittadino</th><th>Reato</th><th>Importo</th><th>Stato</th><th>Data</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessuna multa trovata.</div>'}</div></div>`;
    res.send(pageLayout("Multe", body, "multe", req.portalUser));
  });

  app.get("/arresti", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").toLowerCase().trim();
    const arrests = Object.values(db.arresti || {}).filter(a => !query || `${a.id} ${a.nomeCognome} ${a.reati} ${a.firmaAgente}`.toLowerCase().includes(query)).sort((a,b)=>new Date(b.registratoIl)-new Date(a.registratoIl));
    const cards = arrests.map(a => `<div class="record"><h3>${escapeHtml(a.id)} • ${escapeHtml(a.nomeCognome)}</h3><p><strong>Reati:</strong> ${escapeHtml(a.reati)}</p><p><strong>Agente:</strong> ${escapeHtml(a.firmaAgente)} • <strong>Data:</strong> ${formatDate(a.registratoIl)}</p><p>${escapeHtml(a.descrizioneAccaduto)}</p><a class="button secondary" href="/cittadino/${encodeURIComponent(a.userId)}">Apri fascicolo</a></div>`).join("") || '<div class="empty">Nessun arresto registrato.</div>';
    const body = `<div class="topbar"><div><h1>Fedina penale</h1><p>Consultazione dei provvedimenti registrati nel casellario.</p></div><div class="live">${arrests.length} arresti</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="ID, cittadino, reato o agente"><button>Cerca</button></form><div style="margin-top:16px">${cards}</div></div>`;
    res.send(pageLayout("Fedina penale", body, "arresti", req.portalUser));
  });

  app.get("/targhe", (req, res) => {
    const db = readDb();
    const query = String(req.query.q || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const vehicles = Object.values(db.targhe || {}).filter(v => !query || String(v.targa).includes(query));
    const rows = vehicles.map(v => `<tr><td class="mono">${escapeHtml(v.targa)}</td><td>${escapeHtml(v.modello)}</td><td>${escapeHtml(v.nome)} ${escapeHtml(v.cognome)}</td><td>${escapeHtml(v.colore)}</td><td>${v.assicurazione?.scadenza > Date.now() ? `<span class="status ok">${escapeHtml(v.assicurazione.piano)}</span>` : '<span class="status bad">Non assicurata</span>'}</td><td><a class="button" href="/cittadino/${encodeURIComponent(v.userId)}">Intestatario</a></td></tr>`).join("");
    const body = `<div class="topbar"><div><h1>Registro veicoli</h1><p>Consultazione del registro veicoli e delle posizioni assicurative.</p></div><div class="live">${vehicles.length} veicoli</div></div><div class="card"><form class="search"><input class="input" name="q" value="${escapeHtml(req.query.q || "")}" placeholder="Inserisci una targa"><button>Controlla</button></form><div class="table-wrap" style="margin-top:15px">${rows ? `<table><thead><tr><th>Targa</th><th>Modello</th><th>Intestatario</th><th>Colore</th><th>Assicurazione</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Nessuna targa trovata.</div>'}</div></div>`;
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
