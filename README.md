# IPRP Bot + Portale FDO — uso locale con Visual Studio Code

Questo progetto è configurato per essere eseguito in locale da Visual Studio Code. Non contiene configurazioni o istruzioni di pubblicazione cloud.

## Avvio

1. Apri questa cartella in Visual Studio Code.
2. Copia `.env.example` come `.env`.
3. Inserisci in `.env` `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `PORTALE_PASSWORD` e un valore casuale lungo per `PORTALE_SECRET`.
4. Nel terminale integrato esegui `npm install` una sola volta.
5. Premi `F5` e seleziona **Avvia bot e portale**, oppure esegui `npm start`.
6. Apri [http://localhost:3000/login](http://localhost:3000/login) e accedi con `PORTALE_USER` e `PORTALE_PASSWORD`.

## Dati locali

I dati del bot, i backup e le operazioni elaborate sono salvati nella cartella `data/` del progetto. Questa cartella viene creata automaticamente e non viene inclusa in Git.

Per usare un'altra posizione, imposta `DATA_DIR` nel file `.env` con un percorso assoluto.

## Sviluppo

- `npm run dev`: riavvia automaticamente il programma quando modifichi un file JavaScript.
- `npm run check`: controlla la sintassi dei file principali.

Il cookie di accesso funziona su `http://localhost`. Se in futuro pubblichi il portale con HTTPS, imposta `PORTALE_HTTPS=true`.
