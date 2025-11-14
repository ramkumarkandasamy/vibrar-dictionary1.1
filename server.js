// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { transliterate } = require("transliteration");

// Node 18+ has built-in fetch. If below 18, uncomment below line:
// const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const MYMEMORY_API = "https://api.mymemory.translated.net/get";

// temporary in-memory storage
let searchHistory = [];

// Utility function to fetch JSON safely
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

// main route
app.get("/api/word/:term", async (req, res) => {
  const term = req.params.term?.trim();
  if (!term) return res.status(400).json({ error: "No term" });

  try {
    // 1️⃣ English meaning
    const dictData = await fetchJson(`${DICTIONARY_API}${encodeURIComponent(term)}`).catch(() => null);

    let englishText = null;
    if (Array.isArray(dictData) && dictData[0]) {
      const entry = dictData[0];
      const meaning = entry.meanings?.[0];
      englishText = {
        definition: meaning?.definitions?.[0]?.definition || null,
        example: meaning?.definitions?.[0]?.example || null,
        partOfSpeech: meaning?.partOfSpeech || null
      };
    }

    // 2️⃣ Tamil translation
    const textToTranslate = englishText?.definition || term;
    const mmUrl = `${MYMEMORY_API}?q=${encodeURIComponent(textToTranslate)}&langpair=en|ta`;
    const mmData = await fetchJson(mmUrl).catch(() => null);
    const tamilText = mmData?.responseData?.translatedText || null;

    // 3️⃣ Tamil transliteration
    const tamilTranslit = tamilText ? transliterate(tamilText) : null;

    // 4️⃣ Save to memory (for recent searches)
    searchHistory.unshift({
      word: term,
      tamil: tamilText,
      tamil_transliteration: tamilTranslit,
      searched_at: new Date().toISOString()
    });
    if (searchHistory.length > 50) searchHistory.pop(); // limit to 50 items

    res.json({
      word: term,
      english: englishText,
      tamil: tamilText,
      tamil_transliteration: tamilTranslit
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// get recent
app.get("/api/recent", (req, res) => {
  res.json(searchHistory);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
