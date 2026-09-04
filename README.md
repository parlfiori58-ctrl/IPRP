# 🤖 IPRP Bot + Portale FDO

Bot Discord completo con portale web integrato. Gestisci cittadini, patenti, documenti, veicoli, multe e arresti - tutto da Discord e dal portale web.

![CED IPRP Logo](ced-iprp-logo.png)

---

## ✨ Features

### Bot Discord
- 🤖 30+ comandi slash
- 📋 Gestione cittadini con profili completi
- 📄 Registrazione documenti (passaporto, carta ID, etc.)
- 🎫 Sistema patenti (registra, ritira, punti)
- 💰 Sistema finanziario (portafogli, bonifici, depositi)
- 🚗 Immatricolazione e gestione veicoli
- ⚠️ Registro delle multe
- 👮 Fedina penale (arresti)
- 🎨 Comando /embed personalizzato (con immagini)
- 💾 Backup automatici ogni 10 minuti

### Portale Web
- 🔐 Login protetto con cookie sicuro
- 📊 Dashboard cittadini
- 📑 Visualizzazione profili completi
- 🚫 Registro delle multe (filtrabili)
- 📋 Fedina penale
- 🚗 Registro veicoli (con targa)
- 🔄 Dati sincronizzati in tempo reale con il bot

### Database
- 📁 JSON file (iprp_civili.json)
- 💾 Disco persistente su Railway
- 🔄 Letture dirette = dati sempre aggiornati
- 📦 Backup automatici nella cartella `backups/`

---

## 🚀 Quick Start

### 1. Clone e setup

```bash
git clone https://github.com/tuousername/iprp-bot-portale-fdo.git
cd iprp-bot-portale-fdo
npm install
```

### 2. Crea il .env

```bash
cp .env.example .env
# Riempilo con le tue credenziali
```

### 3. Avvia il bot

```bash
npm start
```

Il bot apparirà online su Discord.  
Il portale sarà su `http://localhost:3000`

---

## 🔧 Configurazione Discord

### Ottieni il TOKEN

1. Vai su https://discord.com/developers/applications
2. Crea una "New Application"
3. Clicca "Bot" → "Add Bot"
4. Clicca "Reset Token" → Copia il token → **DISCORD_TOKEN**

### Ottieni CLIENT_ID e GUILD_ID

- **CLIENT_ID**: Da "General Information" → Application ID
- **GUILD_ID**: Clicca destro sul server Discord → "Copy Server ID"

### Invita il bot

Genera l'URL di invito:
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot+applications.commands
```

Sostituisci `CLIENT_ID` con il tuo valore e apri il link.

---

## 📝 Variabili d'ambiente

Copia il `.env.example` in `.env` e riempilo:

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `DISCORD_TOKEN` | Token del bot | `OTI4Mjk4...` |
| `CLIENT_ID` | ID applicazione Discord | `918298543...` |
| `GUILD_ID` | ID server Discord | `1360353746...` |
| `PORTALE_USER` | Username portale | `fdo` |
| `PORTALE_PASSWORD` | Password portale | `tuaPassword` |
| `PORTALE_FDO_URL` | URL pubblico | `https://...railway.app` |
| `PORT` | Porta Express | `3000` |
| `DATA_DIR` | Cartella dati | `/var/data` o `./data` |

---

## 🚀 Deploy su Railway

### Seguire la guida: [SETUP-RAILWAY.md](SETUP-RAILWAY.md)

In 10 minuti:
1. Prepara credenziali Discord
2. Testa localmente
3. Carica su GitHub (privato)
4. Crea progetto su Railway
5. Configura variabili
6. Abilita disco persistente
7. Deploy!

---

## 🎮 Comandi Discord

### Documenti
```
/registra-documento [cittadino] [tipo]
/rimuovi-documento [cittadino]
```

### Patenti
```
/registra-patente [cittadino] [categoria]
/rimuovi-patente [cittadino]
/decreta-punti-patente [cittadino] [punti]
/aggiungi-punti-patente [cittadino] [punti]
/sequestro-patente [cittadino]
```

### Finanze
```
/portafoglio [cittadino]
/paga [cittadino] [importo]
/bonifico [da] [a] [importo]
/deposita [cittadino] [importo]
/preleva [cittadino] [importo]
```

### Veicoli
```
/immatricola-auto [cittadino] [targa] [modello]
/controlla-targa [targa]
/assicurazione [targa]
```

### Amministrazione
```
/multa [cittadino] [importo] [motivo]
/paga-multa [cittadino] [id-multa]
/registra-arresto [cittadino]
/embed [titolo] [testo] [immagine]
```

---

## 🌐 Portale Web

Accedi su: `https://tuodominio.railway.app/login`

**Credenziali:**
- Username: `fdo`
- Password: quella che hai impostato

**Pagine:**
- `/` - Home (reindirizza a login)
- `/login` - Login
- `/dashboard` - Dashboard cittadini
- `/cittadini` - Lista cittadini
- `/cittadini/[id]` - Profilo cittadino
- `/multe` - Registro delle multe
- `/fedina-penale` - Arresti
- `/veicoli` - Registro veicoli
- `/health` - Health check (pubblico)
- `/logout` - Logout

---

## 📁 Struttura progetto

```
iprp-bot-portale-fdo/
├── index.js                 # Bot Discord principale
├── portal.js                # Server Express
├── package.json             # Dipendenze
├── .env.example             # Template variabili
├── .gitignore               # File da ignorare su Git
├── railway.json             # Configurazione Railway
├── README.md                # Questo file
├── SETUP-RAILWAY.md         # Guida setup
├── ced-iprp-logo.png        # Logo
└── data/                    # Cartella dati (local)
    └── iprp_civili.json     # Database JSON
```

---

## 🔒 Sicurezza

⚠️ **IMPORTANTE:**

- ❌ NON caricare `.env` su GitHub
- ✅ Usa `.env.example` come template
- ✅ Railway memorizza variabili in modo sicuro
- ✅ Login portale usa cookie httpOnly
- ✅ Password database non trasmessa in chiaro

---

## 🐛 Troubleshooting

### Bot non appare online

```bash
# Controlla i log localmente
npm start

# Su Railway, leggi i log del deployment
```

### Portale non raggiungibile

- Aspetta il completamento del deployment (3-5 min)
- Ricarica la pagina (Ctrl+F5)
- Verifica `PORTALE_FDO_URL` in Railway

### Perdo i dati tra i deploy

- Abilita disco persistente su Railway
- Mount path deve essere `/var/data`

### La password non funziona

- Username: `fdo` (case-sensitive)
- Password: quella di `PORTALE_PASSWORD`

---

## 📊 Database

Il database è un file JSON: `iprp_civili.json`

**Struttura:**

```json
{
  "citizens": [
    {
      "id": "123",
      "nome": "Mario Rossi",
      "cognome": "Rossi",
      "dataNascita": "1990-01-15",
      "telefono": "3331234567",
      "email": "mario@example.com",
      "documenti": [...],
      "patente": {...},
      "finanze": {...},
      "veicoli": [...],
      "multe": [...],
      "arresti": [...]
    }
  ]
}
```

---

## 🔄 Aggiornamenti

Ogni volta che modifichi il codice:

```bash
git add .
git commit -m "Descrizione della modifica"
git push origin main
```

Railway notificherà il nuovo commit e farà il deploy automaticamente (2-3 min).

---

## 💰 Costi

### Railway
- **€5/mese (gratis il primo mese)** per app+disco
- Disco persistente 1GB incluso
- Dopo i €5: paghi l'utilizzo extra

### Alternativa: Render
- Piano starter: €7-10/mese
- Disco persistente: €7/mese extra

---

## 📞 Supporto

Per problemi:
1. Leggi SETUP-RAILWAY.md (sezione Troubleshooting)
2. Controlla i log su Railway
3. Verifica il file `.env`

---

## 📋 Licenza

Progetto privato per uso interno.

---

## 🎉 Fatto!

Il tuo bot è pronto. Segui SETUP-RAILWAY.md e sarai online in 10 minuti!

**Buon deployment!** 🚀
