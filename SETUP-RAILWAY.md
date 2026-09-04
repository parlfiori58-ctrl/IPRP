# 🚀 Guida Setup: Deploy IPRP Bot su Railway

Segui questi 10 step per mettere il tuo bot online in meno di 10 minuti.

---

## ✅ STEP 1: Ottieni le credenziali Discord

Prima di tutto, hai bisogno di 3 valori da Discord. Prendi 5 minuti:

### 1a. Crea un'applicazione Discord

1. Vai su https://discord.com/developers/applications
2. Clicca **"New Application"** (pulsante blu)
3. Dai un nome (es. "IPRP Bot")
4. Clicca **"Create"**

### 1b. Crea il Bot e copia il TOKEN

1. Nel menu a sinistra, clicca **"Bot"**
2. Clicca **"Add Bot"** (pulsante blu)
3. Sotto "TOKEN", clicca **"Reset Token"**
4. Un pop-up chiede conferma → Clicca **"Yes, do it!"**
5. **Copia il token** (icona copia a destra) → **DISCORD_TOKEN** ✓

**⚠️ Attenzione:** Questo token è come una password! Non condividerlo!

### 1c. Copia il CLIENT_ID

1. Rimani in "General Information" (menu sinistra)
2. Copia l'**Application ID** → **CLIENT_ID** ✓

### 1d. Copia il GUILD_ID

1. Apri Discord (l'app o il sito)
2. Clicca **destro** sul tuo server
3. Seleziona **"Copy Server ID"** → **GUILD_ID** ✓

---

## ✅ STEP 2: Invita il bot nel server

Il bot deve essere autorizzato ad entrare nel tuo server.

### 2a. Genera l'URL di invito

1. Torna su Discord Developer Portal
2. Clicca **"OAuth2"** (menu sinistra)
3. Clicca **"URL Generator"** (sottomenu)
4. Seleziona questi scope:
   - ✅ `bot`
   - ✅ `applications.commands`
5. Seleziona questi permessi:
   - ✅ `Administrator` (per semplicità)
6. **Copia l'URL** generato in basso

### 2b. Autorizza il bot

1. Incolla l'URL nel browser
2. Seleziona il tuo server dalla lista
3. Clicca **"Authorize"**
4. Completa il CAPTCHA

**Il bot è ora autorizzato!** ✓

---

## ✅ STEP 3: Prepara il file .env locale

Il `.env` contiene le credenziali. Non va mai caricato su GitHub!

### 3a. Crea il file .env

1. Apri la cartella del progetto
2. Vedi il file `.env.example`
3. **Duplicalo** (copia incolla)
4. **Rinominalo** in `.env` (senza extension)

### 3b. Riempilo con i valori

Apri il file `.env` con un editor (VS Code, Sublime, etc.):

```
DISCORD_TOKEN=incolla_il_token_copiato_prima
CLIENT_ID=incolla_il_client_id
GUILD_ID=incolla_il_guild_id
PORTALE_USER=fdo
PORTALE_PASSWORD=scegli_una_password_forte
PORTALE_FDO_URL=http://localhost:3000
PORT=3000
DATA_DIR=/var/data
```

**Salva il file.**

---

## ✅ STEP 4: Testa localmente

Prima di mettere online, testa che tutto funziona nel tuo computer.

Nel terminale (cartella del progetto):

```bash
npm install
npm start
```

Dovresti vedere:
```
✅ Bot IPRP connecting...
✅ Bot IPRP online!
✅ Web server running on port 3000
```

### Prova il portale:

Apri nel browser: http://localhost:3000/login

Login con:
- Username: `fdo`
- Password: quella che hai scelto nel .env

Se tutto funziona → ✅ Procedi a GitHub

Se non funziona:
- Verifica che DISCORD_TOKEN, CLIENT_ID, GUILD_ID siano esatti
- Rivedi il README.txt per errori comuni

---

## ✅ STEP 5: Carica su GitHub

### 5a. Crea un repository GitHub

1. Vai su https://github.com/new
2. Dai un nome (es. `iprp-bot-portale-fdo`)
3. Seleziona **"Private"** (è sensibile!)
4. Clicca **"Create repository"**

### 5b. Carica i file via Git

Nel terminale (cartella del progetto):

```bash
# Inizializza Git
git init

# Aggiungi tutti i file (TRANNE .env grazie al .gitignore)
git add .

# Verifica che .env NON sia incluso:
git status

# Se vedi .env elencato, fai:
git reset .env

# Commit
git commit -m "Versione iniziale IPRP Bot"

# Aggiungi il remote (copia dal sito GitHub dopo aver creato repo)
git remote add origin https://github.com/TUO_USERNAME/iprp-bot-portale-fdo.git

# Push
git branch -M main
git push -u origin main
```

**Il codice è ora su GitHub!** ✓

---

## ✅ STEP 6: Accedi a Railway

### 6a. Crea un account Railway

1. Vai su https://railway.app
2. Clicca **"Login with GitHub"**
3. Autorizza Railway ad accedere ai tuoi repo

### 6b. Dashboard Railway

Sarai automaticamente loggato. Vedrai la dashboard di Railway.

---

## ✅ STEP 7: Crea il progetto su Railway

### 7a. Crea nuovo progetto da GitHub

1. Clicca **"New Project"**
2. Seleziona **"Deploy from GitHub repo"**
3. Autorizza Railway ad accedere ai tuoi repo (se chiede)
4. Seleziona il repository `iprp-bot-portale-fdo`
5. Clicca **"Deploy Now"**

**Railway avvierà il build automaticamente!**

Aspetta 2-3 minuti. Vedrai lo stato progredire:
- 🟡 Building...
- 🟡 Building complete
- 🟡 Deploying...
- 🟢 Success!

---

## ✅ STEP 8: Configura le variabili d'ambiente

Il `.env` locale non basta. Devi dire a Railway quali valori usare.

### 8a. Accedi alle variabili

1. Nel pannello Railway, clicca sul tuo progetto
2. Clicca il tab **"Variables"**

### 8b. Aggiungi le variabili

Clicca **"Add Variable"** per ogni riga (o "Add Raw"'):

| Chiave | Valore |
|--------|--------|
| `DISCORD_TOKEN` | Il token copiato da Discord (nascosto) |
| `CLIENT_ID` | L'ID client da Discord |
| `GUILD_ID` | L'ID del server Discord |
| `PORTALE_USER` | `fdo` |
| `PORTALE_PASSWORD` | Una password forte |
| `PORTALE_FDO_URL` | Vedi step 8c |
| `PORT` | `3000` |
| `DATA_DIR` | `/var/data` |

### 8c. Ottieni l'URL pubblico per PORTALE_FDO_URL

1. Nel pannello Railway, clicca il tab **"Settings"**
2. Scorri fino a **"Domains"**
3. Copia il dominio pubblico (es. `https://iprp-bot-abc123xyz.railway.app`)
4. Torna a **"Variables"**
5. Aggiungi/modifica `PORTALE_FDO_URL` con questo URL

**Salva le variabili.**

---

## ✅ STEP 9: Abilita il disco persistente

Senza disco persistente, i dati (JSON) si perdono a ogni deploy!

### 9a. Crea il disco

1. Nel pannello Railway, clicca il tab **"Storage"**
2. Clicca **"Add Storage"** (pulsante verde)

### 9b. Configura il mount

3. Compila:
   - **Mount Path**: `/var/data` (esattamente così!)
   - **Size**: `1 GB` (abbondante per il JSON)
4. Clicca **"Add"**

**Questo disco persisterà tra i deploy!** ✓

---

## ✅ STEP 10: Verifica il deploy

Quasi fatto! Controlla che tutto sia online.

### 10a. Guarda lo stato

1. Nel pannello Railway, clicca il tab **"Deployments"**
2. Dovresti vedere un deployment con status **"Success"** (verde)
3. Se fallisce (rosso), clicca per leggere i log

### 10b. Prova il bot

Apri Discord:
- Il bot dovrebbe apparire **online** nel tuo server ✓

### 10c. Prova il portale

Apri nel browser:
```
https://iprp-bot-abc123.railway.app/login
```

Login con:
- Username: `fdo`
- Password: quella che hai impostato

Se vedi la dashboard → **Fatto! 🎉**

---

## 🔄 Come aggiornare il bot in futuro

Il bello di Railway è che si aggiorna automaticamente da GitHub!

Ogni volta che modifichi il codice:

```bash
# Modifica i file (index.js, portal.js, etc.)

# Commit e push
git add .
git commit -m "Aggiungi nuovo comando /exemple"
git push origin main
```

**Automaticamente:**
- Railway vede il nuovo commit
- Avvia un nuovo build e deploy (2-3 minuti)
- Il bot si aggiorna senza perdere dati ✓

---

## 💰 Costi Railway

- **Primissimi €5/mese**: Gratis (credito iniziale)
- **Disco 1GB**: Incluso nei €5
- **Dopo €5**: Paghi solo quello che usi
- **Nessuna carta di credito** il primo mese

Molto economico rispetto a Render!

---

## 🆘 Troubleshooting

### Il bot non appare online su Discord

**Soluzione:**
1. Vai su Railway → Tab "Deployments"
2. Clicca il deployment
3. Leggi i log (sezione "Build Logs")
4. Controlla che `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID` siano esatti
5. Se è errore di codice, vedi il README.txt

### Il portale dice "Pagina non trovata"

**Soluzione:**
- Il deploy potrebbe ancora essere in corso (3-5 minuti)
- Ricarica la pagina (Ctrl+F5)
- Controlla che `PORTALE_FDO_URL` sia esatto in Railway

### Perdo i dati tra i deploy

**Soluzione:**
- Il disco persistente non è montato
- Vai a **Storage** in Railway
- Verifica che il mount path sia `/var/data`
- Se manca, crealo di nuovo

### Il build fallisce

**Soluzione:**
1. Leggi i log su Railway
2. Controlla che `package.json` sia corretto
3. Verifica che `index.js` e `portal.js` non abbiano errori di sintassi
4. Usa il comando locale: `npm run check`

### La password del portale non funziona

**Soluzione:**
- Il login è case-sensitive
- Controlla che `PORTALE_PASSWORD` sia esatta in Railway
- Ricordati lo username: `fdo`

---

## 📋 Checklist finale

- [ ] Credenziali Discord ottenute (TOKEN, CLIENT_ID, GUILD_ID)
- [ ] File `.env` creato da `.env.example`
- [ ] Bot testato localmente (npm install, npm start)
- [ ] Bot invitato nel server Discord
- [ ] Repository GitHub creato (privato)
- [ ] Codice caricato su GitHub
- [ ] Account Railway creato
- [ ] Progetto Railway creato da GitHub
- [ ] Variabili d'ambiente configurate (8 variabili)
- [ ] Disco persistente creato su `/var/data`
- [ ] Deploy completato con status "Success"
- [ ] Bot online su Discord
- [ ] Portale raggiungibile e funzionante
- [ ] Password del portale funziona

**Se tutto è checkato → Sei pronto!** 🎉

---

## 🎯 Prossimi step

1. Segui i 10 step di questa guida
2. Il bot sarà online su Railway
3. Ogni modifica su GitHub si aggiorna automaticamente
4. Goditi il tuo bot senza perdere dati!

**Buon deployment!** 🚀
