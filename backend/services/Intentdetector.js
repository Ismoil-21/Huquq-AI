"use strict";
/**
 * AI-powered Intent Detector
 * Kategoriyani LLM orqali aniqlaydigan classifier.
 * Keyword-based detectCategory() ni to'liq almashtiradi.
 */

const Groq = require("groq-sdk");

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const CATEGORIES = [
  "criminal",
  "civil",
  "labor",
  "family",
  "inheritance",
  "real_estate",
  "consumer",
  "administrative",
  "tax",
  "business",
  "immigration",
  "unknown",
];

const CATEGORY_UZ_MAP = {
  criminal:       "jinoiy",
  civil:          "fuqarolik",
  labor:          "mehnat",
  family:         "oila",
  inheritance:    "meros",
  real_estate:    "uy_joy",
  consumer:       "istemolchi",
  administrative: "ma_muriy",
  tax:            "soliq",
  business:       "tadbirkorlik",
  immigration:    "immigratsiya",
  unknown:        "boshqa",
};

// Fallback: keyword-based (LLM ishlamasa)
const KEYWORD_FALLBACK = [
  { id: "labor",          kw: ["ish ", "maosh","ishdan","ta'til","xodim","ish haqi","mehnat","bo'shatish","labor","зарплата","работа","уволить"] },
  { id: "family",         kw: ["ajralish","nikoh","aliment","oila","zags","turmush","divorce","marriage","развод","алименты","семья"] },
  { id: "inheritance",    kw: ["meros","vasiyat","notarius","vafot","merosxo'r","inheritance","наследство","завещание"] },
  { id: "real_estate",    kw: ["yer","kadastr","hovli","uchastka","kvartira","ijara","mulk","land","земля","участок","квартира","аренда"] },
  { id: "consumer",       kw: ["tovar","qaytarish","sotuvchi","kafolat","sifatsiz","do'kon","xaridor","товар","возврат"] },
  { id: "criminal",       kw: ["jinoyat","o'g'irlik","firib","politsiya","pora","o'ldi","urdi","zo'rlash","tahdid","crime","murder","преступление","убийство","арест"] },
  { id: "business",       kw: ["biznes","tadbirkor","kompaniya","soliq","ooo","ip","business","налог","компания"] },
  { id: "administrative", kw: ["hokimiyat","davlat","korrupsiya","mansabdor","shikoyat","government","чиновник"] },
  { id: "tax",            kw: ["soliq","nds","daromad solig'i","tax","налог","ндс"] },
];

async function detectIntentAI(userMessage) {
  if (!groqClient) return detectIntentKeyword(userMessage);

  try {
    const resp = await groqClient.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 20,
      messages: [
        {
          role: "system",
          content: `You are a legal category classifier for Uzbekistan law.
Classify the user message into exactly ONE category.
Output ONLY the category ID, nothing else.

Categories:
- criminal (jinoyat, crime, murder, theft, fraud, arrest)
- civil (fuqarolik, contract disputes, property, damages)
- labor (mehnat, employment, salary, dismissal, workplace)
- family (oila, divorce, alimony, marriage, child custody)
- inheritance (meros, will, estate, heirs)
- real_estate (yer, land, apartment, rent, property)
- consumer (istemolchi, product return, warranty, consumer rights)
- administrative (hokimiyat, government, official complaints)
- tax (soliq, tax, VAT, income tax)
- business (tadbirkorlik, company, LLC, entrepreneurship)
- immigration (migration, citizenship, visa, residence permit)
- unknown (cannot classify)`,
        },
        { role: "user", content: userMessage.slice(0, 500) },
      ],
    });

    const raw = (resp.choices?.[0]?.message?.content || "").trim().toLowerCase();
    const matched = CATEGORIES.find((c) => raw.includes(c));
    return matched || detectIntentKeyword(userMessage);
  } catch {
    return detectIntentKeyword(userMessage);
  }
}

function detectIntentKeyword(text = "") {
  const low = text.toLowerCase();
  for (const cat of KEYWORD_FALLBACK) {
    if (cat.kw.some((k) => low.includes(k))) return cat.id;
  }
  return "unknown";
}

function toUzCategory(englishId) {
  return CATEGORY_UZ_MAP[englishId] || "boshqa";
}

module.exports = { detectIntentAI, detectIntentKeyword, toUzCategory, CATEGORIES };