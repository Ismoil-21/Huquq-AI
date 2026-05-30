"use strict";
/**
 * Colloquial Uzbek Parser
 * So'zlashuv tilida yozilgan o'zbek jumlalarini huquqiy niyatlarga aylantiradi.
 * "ustidan yozmoqchiman" → { action: "report", target: "person" }
 */

// ── So'zlashuv → huquqiy niyat xaritasi ──────────────────────
const COLLOQUIAL_MAP = [
  // Shikoyat berish
  { pattern: /ustidan\s+(yoz|shikoyat|ariza)/i,         action: "report_person",   hint: "shikoyat berish" },
  { pattern: /ariza\s+(ber|qil|yoz)/i,                  action: "file_complaint",  hint: "ariza berish" },
  { pattern: /shikoyat\s+(qil|ber|yoz)/i,               action: "file_complaint",  hint: "shikoyat berish" },
  { pattern: /qayerga\s+(yoz|bor|murojaat)/i,           action: "where_to_report", hint: "qayerga murojaat qilish" },
  { pattern: /nima\s+qil/i,                             action: "what_to_do",      hint: "keyingi qadam" },

  // Jismoniy zo'ravonlik
  { pattern: /ur(ib|di|ishdi|gan)/i,                    action: "assault",         hint: "jismoniy tajovuz" },
  { pattern: /kalt(aklash|akladi|ak yedi)/i,            action: "assault",         hint: "kaltaklash" },
  { pattern: /zo'r(lik|ladi|lab)/i,                     action: "violence",        hint: "zo'ravonlik" },
  { pattern: /tahdid\s+(qil|sol)/i,                     action: "threat",          hint: "tahdid" },

  // Moliyaviy
  { pattern: /pul(im|ini|lar)?(ni)?\s+(ber|qaytarma|olmay|olmayapti)/i, action: "money_dispute",  hint: "pul nizosi" },
  { pattern: /aldab\s+(ket|ol)/i,                       action: "fraud",           hint: "firibgarlik" },
  { pattern: /qarz\s+(ber|ol|qaytarma)/i,               action: "debt",            hint: "qarz nizosi" },
  { pattern: /maosh(im|ini)?\s+(ber|olmay|to'lamay)/i,  action: "unpaid_salary",   hint: "ish haqi to'lanmagan" },

  // Mehnat
  { pattern: /ish(dan)?\s+(hayd|bo'shat|quvib)/i,       action: "wrongful_termination", hint: "noqonuniy ishdan bo'shatish" },
  { pattern: /ishdan\s+(chiqar|ketkazish)/i,             action: "wrongful_termination", hint: "ishdan bo'shatish" },
  { pattern: /ish\s+berm(ayapti|adi)/i,                 action: "unpaid_salary",   hint: "ish haqi muammosi" },

  // Mulk
  { pattern: /uy(im|ini|dan)?\s+(ol|tort|egall)/i,      action: "property_seizure", hint: "mulkni tortib olish" },
  { pattern: /yerим|yer(ni|im|dan)?\s+(ol|tort)/i,      action: "land_dispute",    hint: "yer nizosi" },
  { pattern: /ijar(a|achi)\s+(qochib|chiqib|to'lama)/i, action: "rental_dispute",  hint: "ijara nizosi" },

  // Oila
  { pattern: /ajrash(moqchi|aman|ish)/i,                action: "divorce",         hint: "ajralish" },
  { pattern: /aliment\s*(to'lamapt|olmayap)/i,          action: "alimony",         hint: "aliment" },

  // Iste'molchi
  { pattern: /tovar(ni)?\s+(qaytarish|qaytarmoq|almashtirish)/i, action: "return_goods", hint: "tovar qaytarish" },
  { pattern: /kafolat\s*(bo'yicha|muddati)/i,           action: "warranty_claim",  hint: "kafolat" },
];

// ── Qanday so'rash turini aniqlash ────────────────────────────
const QUESTION_COMPLEXITY = {
  SIMPLE:  "simple",   // "qayerga yozaman", "nima qilay"
  MEDIUM:  "medium",   // vaziyatni tushuntirish + yo'l ko'rsatish
  COMPLEX: "complex",  // to'liq huquqiy tahlil
};

function detectComplexity(text) {
  const low = text.toLowerCase().trim();
  const wordCount = low.split(/\s+/).length;

  // Oddiy savol — qisqa, bir muammo
  if (wordCount <= 15 && /^(qayerga|nima|kim|qachon|qanday|bo'ladimi|mumkinmi)/i.test(low)) {
    return QUESTION_COMPLEXITY.SIMPLE;
  }

  // O'rta — vaziyat tushuntirilgan
  if (wordCount <= 50) return QUESTION_COMPLEXITY.MEDIUM;

  // Murakkab — batafsil bayonot
  return QUESTION_COMPLEXITY.COMPLEX;
}

// ── Asosiy parser ─────────────────────────────────────────────
function parseUzbekIntent(text = "") {
  const low = text.toLowerCase();
  const detected = [];

  for (const entry of COLLOQUIAL_MAP) {
    if (entry.pattern.test(low)) {
      detected.push({ action: entry.action, hint: entry.hint });
    }
  }

  const complexity = detectComplexity(text);

  // Qurbonni aniqlash — faqat aniq aytilgan bo'lsa
  // "meni urishdi" → victim: user
  // "ukamni urishdi" → victim: third_party (aniq aytilgan)
  // "bolani" — FAQAT agar "bola" so'zi ishlatilsa
  const victimSelf    = /\b(meni|menga|men)\b/i.test(low);
  const victimExplicit = /(ukam|akam|opam|singil|do'stim|qo'shnim|xotinim|erim|otam|onam)\b/i.test(low);
  const victimMinor   = /\b(bolam|farzandim|o'g'lim|qizim)\b/i.test(low); // FAQAT agar ochiq aytilsa

  let victim = "unspecified";
  if (victimSelf)     victim = "user";
  if (victimExplicit) victim = "third_party_named";
  if (victimMinor)    victim = "user_child";

  return {
    actions:    detected,
    complexity,
    victim,
    hasActions: detected.length > 0,
    hints:      detected.map((d) => d.hint),
  };
}

// ── Response format tanlash ───────────────────────────────────
function getResponseFormat(complexity, hasStructuredActions) {
  if (complexity === QUESTION_COMPLEXITY.SIMPLE) {
    return "plain"; // Faqat oddiy paragraf — hech qanday emoji/heading
  }
  if (complexity === QUESTION_COMPLEXITY.MEDIUM) {
    return "brief"; // 2-3 paragraph, minimal tuzilma
  }
  return "structured"; // To'liq tuzilma faqat murakkab savollarda
}

module.exports = { parseUzbekIntent, detectComplexity, getResponseFormat, QUESTION_COMPLEXITY };