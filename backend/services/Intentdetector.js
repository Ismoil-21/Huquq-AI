"use strict";
/**
 * Intent Detector — AI + keyword fallback
 * Muhim: HECH QACHON o'z-o'zicha bola, voyaga yetmagan
 * yoki boshqa tomonlarni xabardan tashqari xulosa qilmaydi.
 */

const Groq = require("groq-sdk");

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const CATEGORIES = [
  "criminal", "civil", "labor", "family",
  "inheritance", "real_estate", "consumer",
  "administrative", "tax", "business", "immigration", "unknown",
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

// Keyword fallback — aniq iboralar
const KEYWORD_FALLBACK = [
  {
    id: "criminal",
    kw: [
      "urib","urdi","urishdi","kaltakladi","zo'rladi","tahdid",
      "o'g'irlik","o'g'irladi","firib","aldadi","aldab",
      "qotillik","o'ldirdi","jinoyat","politsiya","prokuratura",
      "hibsga","qamoq","pora","shantaj","shikoyat",
      "преступление","убийство","арест","мошенничество",
      "crime","assault","theft","fraud","police",
    ],
  },
  {
    id: "labor",
    kw: [
      "ish haqi","maosh","mehnat","ishdan bo'shatish","haydadi",
      "quvib chiqardi","ta'til","xodim","ish shartnomasi",
      "зарплата","работа","уволить","трудовой",
    ],
  },
  {
    id: "family",
    kw: [
      "ajralish","nikoh","aliment","turmush","zags",
      "ajrashmoqchi","развод","алименты","семья",
    ],
  },
  {
    id: "inheritance",
    kw: ["meros","vasiyat","notarius","vafot","merosxo'r","наследство","завещание"],
  },
  {
    id: "real_estate",
    kw: [
      "yer","kadastr","hovli","uchastka","kvartira","ijara",
      "mulk","uy sotish","uy sotib","земля","участок","квартира","аренда",
    ],
  },
  {
    id: "consumer",
    kw: ["tovar","qaytarish","sotuvchi","kafolat","sifatsiz","do'kon","товар","возврат"],
  },
  {
    id: "business",
    kw: ["biznes","tadbirkor","mchj","ooo","ip tadbirkor","kompaniya","компания","ООО"],
  },
  {
    id: "administrative",
    kw: ["hokimiyat","davlat organi","mansabdor","korrupsiya","чиновник"],
  },
  {
    id: "tax",
    kw: ["soliq","nds","daromad solig'i","налог","ндс"],
  },
];

// ── AI classifier ─────────────────────────────────────────────
async function detectIntentAI(userMessage) {
  if (!groqClient) return detectIntentKeyword(userMessage);

  try {
    const resp = await groqClient.chat.completions.create({
      model:       "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens:  15,
      messages: [
        {
          role: "system",
          content: `You are a legal intent classifier for Uzbekistan law.
Classify into ONE category. Output ONLY the category word.

IMPORTANT RULES:
- "ustidan yozmoqchiman" = report_to_authorities = criminal
- "urib ketishdi" = assault = criminal
- "pul bermayapti" = could be labor OR civil — check context
- Do NOT infer children, minors unless explicitly mentioned
- "u bolani" = "that person/guy" in colloquial Uzbek, NOT a child

Categories: criminal civil labor family inheritance real_estate consumer administrative tax business immigration unknown`,
        },
        { role: "user", content: userMessage.slice(0, 400) },
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

function toUzCategory(id) {
  return CATEGORY_UZ_MAP[id] || "boshqa";
}

module.exports = { detectIntentAI, detectIntentKeyword, toUzCategory, CATEGORIES };