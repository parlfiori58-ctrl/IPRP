IPRP BOT + PORTALE FDO — VERSIONE PRONTA PER RENDER

CONTENUTO
- index.js: bot Discord completo + comando /portale-fdo
- portal.js: sito Portale FDO
- package.json: dipendenze e comando di avvio
- render.yaml: configurazione automatica Render con disco persistente
- .env.example: esempio variabili

COME PUBBLICARLO DA IPHONE
1. Estrai questo ZIP nell’app File.
2. Carica tutti i file in un repository GitHub. NON caricare mai il tuo file .env.
3. Su Render scegli New > Blueprint.
4. Collega il repository GitHub contenente render.yaml.
5. Inserisci le variabili richieste:
   DISCORD_TOKEN = token del bot
   CLIENT_ID = ID applicazione Discord
   GUILD_ID = ID server Discord
   PORTALE_PASSWORD = password scelta per il portale
   PORTALE_FDO_URL = inizialmente puoi lasciare un valore provvisorio
6. Crea il servizio. Render genererà un link simile a:
   https://iprp-bot-portale-fdo.onrender.com
7. Torna nelle variabili del servizio e imposta:
   PORTALE_FDO_URL=https://iprp-bot-portale-fdo.onrender.com
8. Salva e fai Manual Deploy > Deploy latest commit.
9. Nel server Discord usa /portale-fdo.

LOGIN PORTALE
Utente predefinito: fdo
Password: il valore impostato in PORTALE_PASSWORD

SALVATAGGIO DATI
Il progetto usa DATA_DIR=/var/data e il Blueprint crea un disco persistente da 1 GB.
Il database, la copia precedente e i backup vengono salvati nel disco e rimangono dopo riavvii e deploy.
Il disco persistente richiede un servizio Render a pagamento. Senza disco, il filesystem Render è temporaneo e i dati possono sparire dopo riavvii o nuovi deploy.

COMANDI LOCALI
npm install
npm start

CONTROLLO
npm run check
