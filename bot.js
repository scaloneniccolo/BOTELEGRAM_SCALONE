const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const conf = JSON.parse(fs.readFileSync('conf.json'));
const token = conf.key;
const apiKey = conf.apiKey;
const bot = new TelegramBot(token, { polling: true });
const fetch = require('node-fetch');

const leaguesMapping = {
    "soccer_epl": { name: "PREMIER LEAGUE", flag: "🇬🇧" },
    "soccer_spain_la_liga": { name: "LA LIGA", flag: "🇪🇸" },
    "soccer_germany_bundesliga": { name: "BUNDESLIGA", flag: "🇩🇪" },
    "soccer_italy_serie_a": { name: "SERIE A", flag: "🇮🇹" },
    "soccer_france_ligue_one": { name: "LIGUE 1", flag: "🇫🇷" }
};

function TodayDate() {
    const today = new Date();
    const start = today.toISOString().split('T')[0] + "T00:00:00Z";
    const end = today.toISOString().split('T')[0] + "T23:59:59Z";
    return { start, end };
}

async function Soonmatches() {
    try {
        let allMatches = {};
        for (const league of Object.keys(leaguesMapping)) {
            const url = `https://api.the-odds-api.com/v4/sports/${league}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&inPlay=true`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data.length > 0) allMatches[league] = data;
        }
        return Object.keys(allMatches).length > 0 ? allMatches : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getTodayMatches() {
    try {
        const { start, end } = TodayDate();
        let allMatches = {};
        for (const league of Object.keys(leaguesMapping)) {
            const url = `https://api.the-odds-api.com/v4/sports/${league}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal&commenceTimeFrom=${start}&commenceTimeTo=${end}`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data.length > 0) allMatches[league] = data;
        }
        return Object.keys(allMatches).length > 0 ? allMatches : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function formatMatchInfo(match) {
    const homeTeam = match.home_team;
    const awayTeam = match.away_team;
    const time = new Date(match.commence_time).toLocaleString();
    let oddsText = 'Quote non disponibili';
    if (match.bookmakers?.length > 0) {
        const outcomes = match.bookmakers[0].markets[0].outcomes;
        const homeWin = outcomes.find(o => o.name === homeTeam)?.price || 'N/D';
        const draw = outcomes.find(o => o.name === "Draw")?.price || 'N/D';
        const awayWin = outcomes.find(o => o.name === awayTeam)?.price || 'N/D';
        oddsText = `1: ${homeWin} | X: ${draw} | 2: ${awayWin}`;
    }
    return `${homeTeam} vs ${awayTeam}\nData: ${time}\nQuote 1X2: ${oddsText}\n`;
}

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();
    if (text === "/start") {
        bot.sendMessage(chatId, "Benvenuto! Usa /soon per le quote dei prossimi giorni, /today per le quote del giorno o /help per i comandi disponibili.");
    } else if (text === "/help") {
        bot.sendMessage(chatId, `
Comandi disponibili:
/start - Avvia il bot e mostra i comandi principali.
/soon - Mostra le partite e le quote dei prossimi giorni.
/today - Mostra le partite e le quote di oggi. 
/help - Mostra questo messaggio con le istruzioni.

`);
    } else if (text === "/soon") {
        bot.sendMessage(chatId, "Caricamento delle partite dei prossimi giorni...");
        const matches = await Soonmatches();
        if (matches) {
            for (const [league, data] of Object.entries(matches)) {
                let message = `${leaguesMapping[league].flag} ${leaguesMapping[league].name} 🏆\n\n`;
                data.forEach(match => {
                    message += formatMatchInfo(match) + "----------------\n";
                });
                bot.sendMessage(chatId, message);
            }
        } else {
            bot.sendMessage(chatId, "Nessuna partita trovata o errore nella richiesta.");
        }
    } else if (text === "/today") {
        bot.sendMessage(chatId, "Caricamento delle partite di oggi...");
        const matches = await getTodayMatches();
        if (matches) {
            for (const [league, data] of Object.entries(matches)) {
                let message = `${leaguesMapping[league].flag} ${leaguesMapping[league].name} 🏆\n\n`;
                data.forEach(match => {
                    message += formatMatchInfo(match) + "----------------\n";
                });
                bot.sendMessage(chatId, message);
            }
        } else {
            bot.sendMessage(chatId, "Nessuna partita trovata per oggi o errore nella richiesta.");
        }
    } else {
        bot.sendMessage(chatId, "Comando non riconosciuto. Usa /help per vedere i comandi disponibili.");
    }
});

console.log("Bot avviato con successo!");