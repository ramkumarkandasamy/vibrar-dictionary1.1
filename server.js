// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { transliterate } = require("transliteration");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const MYMEMORY_API = "https://api.mymemory.translated.net/get";

// Recent history storage
let searchHistory = [];

// Safe JSON fetcher
async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/*
====================================================
   🔥 MAIN ROUTE → Translate + Dictionary + Transliteration
====================================================
POST /api/translate
BODY:
{
  "text": "hello",
  "sourceLang": "en",
  "targetLang": "ta"
}
====================================================
*/

app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: "Missing text or language params" });
  }

  try {
    let englishDefinition = null;

    // 1️⃣ English Dictionary Meaning (only when English is source)
    if (sourceLang === "en") {
      const dictData = await fetchJson(`${DICTIONARY_API}${encodeURIComponent(text)}`).catch(() => null);

      if (Array.isArray(dictData) && dictData[0]) {
        const entry = dictData[0];
        const meaning = entry.meanings?.[0];
        englishDefinition = {
          definition: meaning?.definitions?.[0]?.definition || null,
          example: meaning?.definitions?.[0]?.example || null,
          partOfSpeech: meaning?.partOfSpeech || null
        };
      }
    }

    // Select text to translate
    const translateText = englishDefinition?.definition || text;

    // 2️⃣ Main Translation (any language direction)
    const mmUrl = `${MYMEMORY_API}?q=${encodeURIComponent(translateText)}&langpair=${sourceLang}|${targetLang}`;
    const mmData = await fetchJson(mmUrl).catch(() => null);
    const translatedText = mmData?.responseData?.translatedText || null;

    // 3️⃣ Transliteration
    let translitValue = null;

    if (targetLang === "ta") {
      // Tamil → Show Tamil pronunciation in English
      translitValue = transliterate(translatedText);
    } else {
      // English side transliteration
      translitValue = transliterate(text);
    }

    // 4️⃣ Save to recent searches
    searchHistory.unshift({
      input: text,
      source: sourceLang,
      target: targetLang,
      translated: translatedText,
      transliteration: translitValue,
      searched_at: new Date().toISOString()
    });
    if (searchHistory.length > 50) searchHistory.pop();

    // 5️⃣ Response
    res.json({
      input: text,
      sourceLang,
      targetLang,
      englishDefinition,
      translatedText,
      transliteration: translitValue
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Get recent search history
app.get("/api/recent", (req, res) => {
  res.json(searchHistory);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
