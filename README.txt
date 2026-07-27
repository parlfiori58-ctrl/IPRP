IPRP BOT + PORTALE FDO — VERSIONE CORRETTA

1. Carica tutti i file di questa cartella nel repository GitHub, sostituendo quelli vecchi.
2. Su Render apri il servizio e premi Manual Deploy > Deploy latest commit.
3. Controlla le variabili Environment:
   DISCORD_TOKEN
   CLIENT_ID
   GUILD_ID
   PORTALE_USER
   PORTALE_PASSWORD
   PORTALE_FDO_URL=https://NOME-SERVIZIO.onrender.com
   DATA_DIR=/var/data (solo se hai il disco persistente montato su /var/data)
4. Apri https://NOME-SERVIZIO.onrender.com/login
5. Accedi con PORTALE_USER e PORTALE_PASSWORD.

CORREZIONI:
- /health è pubblico e funziona con il controllo salute di Render.
- Il sito parte prima del login Discord, quindi non mostra più una pagina vuota se il bot tarda a connettersi.
- Login HTML con cookie sicuro, invece del vecchio popup Basic Auth.
- Pagina 404 personalizzata.
- Dashboard, cittadini, multe, fedina penale e veicoli.
- I dati vengono letti direttamente da iprp_civili.json ad ogni richiesta: ogni modifica del bot compare automaticamente nel portale.

IMPORTANTE SUI DATI:
Il disco persistente di Render è necessario per conservare il file JSON attraverso deploy e riavvii. Senza disco persistente il filesystem di Render è temporaneo.
