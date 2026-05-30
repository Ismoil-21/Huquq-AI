"use strict";
/**
 * Safety Layer — barcha AI javoblaridan oldin ishlaydi.
 *
 * 1. Xavfli niyatlarni aniqlaydi (qanday jinoyat qilish, qochish, yashirish)
 * 2. Xavfli javoblarni bloklaydi
 * 3. Ruxsat etilgan huquqiy yo'nalishga yo'naltiradi
 */

// ── Xavfli niyat patternslar ─────────────────────────────────
const DANGEROUS_INTENT_PATTERNS = [
  // O'zbekcha
  /qanday\s+(o['']ldirish|o'ldiraman|o'g'irlayman|o'g'irlash|zo'rlayman|zo'rlash)/i,
  /qanday\s+(qochish|qochaman|yashirinaman|yashirish|kuzatuvdan\s+qochish)/i,
  /qanday\s+(pora\s+berish|pora\s+olish|pora\s+beraman)/i,
  /izlarni\s+(yo'q\s+qilish|yo'qotish|o'chirish)/i,
  /dalillarni\s+(yo'q\s+qilish|yashirish|yo'qotish)/i,
  /qanday\s+(firib\s+berish|aldash|firib)/i,
  /(bomb|portlovchi|qurol)\s*(yasash|qilish|qurish)/i,
  /javobgarlikdan\s+(qochish|qutilish|ozod\s+bo['']lish)/i,
  /politsiyadan\s+(qochish|yashirinish)/i,
  /guvohlarni\s+(tahdid\s+qilish|qo'rqitish|bosim)/i,
  /terror|terrorizm|ekstremizm/i,

  // Ruscha
  /как\s+(убить|украсть|изнасиловать|скрыться|избежать\s+наказания)/i,
  /как\s+(дать\s+взятку|получить\s+взятку|подкупить)/i,
  /уничтожить\s+(улики|доказательства|следы)/i,
  /скрыть\s+(преступление|доказательства|улики)/i,
  /избежать\s+(ответственности|наказания|суда)/i,

  // English
  /how\s+to\s+(kill|murder|steal|rape|escape\s+police|avoid\s+punishment)/i,
  /how\s+to\s+(bribe|hide\s+evidence|destroy\s+evidence)/i,
  /how\s+to\s+(commit|get\s+away\s+with)/i,
  /evade\s+(taxes|police|justice|law)/i,
];

// ── Og'ir jinoyat mavzulari (yo'naltirish kerak) ─────────────
const SERIOUS_CRIME_PATTERNS = [
  /o['']ldirish|o['']ldirdi|o['']ldirildi|qotillik/i,
  /zo'rlash|zo'rladi|jinsiy\s+zo'ravonlik/i,
  /terror|portlash|qurol\s+yasash/i,
  /murder|rape|terrorism|bomb/i,
  /убийство|изнасилование|терроризм/i,
];

// ── Natija ────────────────────────────────────────────────────
const SAFETY_RESULT = {
  SAFE:       "safe",
  BLOCKED:    "blocked",
  REDIRECTED: "redirected",
};

/**
 * Foydalanuvchi xabarini tekshiradi.
 * @returns {{ status, message|null }}
 */
function checkUserMessage(userMessage) {
  const text = String(userMessage || "");

  // Xavfli niyat — bloklash
  for (const pattern of DANGEROUS_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        status:  SAFETY_RESULT.BLOCKED,
        message: buildBlockedMessage(text),
      };
    }
  }

  // Og'ir jinoyat mavzusi — yo'naltirish
  for (const pattern of SERIOUS_CRIME_PATTERNS) {
    if (pattern.test(text)) {
      return {
        status:   SAFETY_RESULT.REDIRECTED,
        guidance: buildCrimeGuidance(text),
      };
    }
  }

  return { status: SAFETY_RESULT.SAFE };
}

/**
 * AI javobini tekshiradi — xavfli tarkib bormi?
 */
function checkAIResponse(responseText) {
  const text = String(responseText || "");

  // AI tasodifan xavfli ko'rsatmalar berganmi?
  const RESPONSE_DANGER_PATTERNS = [
    /\d+\s*(qadam|bosqich|step)\s*:.*\s*(o['']ldirish|o'g'irlash|qochish)/i,
    /quyidagi\s+yo['']l\s+bilan\s+(jinoyat|qil|yashir)/i,
    /punishment\s+can\s+be\s+avoided\s+by/i,
    /to\s+get\s+away\s+with\s+it/i,
    /избежать\s+наказания\s+можно\s+если/i,
  ];

  for (const pattern of RESPONSE_DANGER_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe:    false,
        message: "Xavfsizlik filtri: javob qayta ishlov berildi.",
      };
    }
  }

  return { safe: true };
}

function buildBlockedMessage(text) {
  const isRu = /как|что|кто|где|убий|кража/i.test(text);
  const isEn = /how|what|murder|theft|crime/i.test(text);

  if (isRu) {
    return `⚠️ Данный запрос не может быть обработан.

Я не могу предоставлять инструкции по совершению незаконных действий, уклонению от правосудия или причинению вреда.

Если вы оказались в трудной ситуации:
• Позвоните на линию юридической помощи
• Обратитесь к адвокату
• Свяжитесь с правоохранительными органами

Я готов объяснить ваши законные права и возможные правовые последствия.`;
  }

  if (isEn) {
    return `⚠️ This request cannot be processed.

I cannot provide instructions for committing illegal acts, evading justice, or causing harm.

If you are in a difficult situation:
• Contact a legal aid service
• Consult with a lawyer
• Reach out to law enforcement

I can explain your legal rights and potential legal consequences.`;
  }

  return `⚠️ Bu so'rov qayta ishlanmaydi.

Men noqonuniy harakatlar qilish, huquqdan qochish yoki zarar yetkazish bo'yicha ko'rsatmalar bera olmayman.

Qiyin vaziyatda bo'lsangiz:
• Huquqiy yordam xizmatiga murojaat qiling
• Advokat bilan maslahatlashing
• Huquq-tartibot organlariga murojaat qiling

Sizning qonuniy huquqlaringiz va mumkin bo'lgan huquqiy oqibatlar haqida tushuntira olaman.`;
}

function buildCrimeGuidance(text) {
  return {
    hasSeriousCrime: true,
    advice: {
      uz: "Bu og'ir jinoyat mavzusi. Advokat bilan darhol maslahatlashing. Jimlik huquqingiz bor — tergov paytida advokatdan tashqari hech narsa aytmang (JPK 68-modda).",
      ru: "Это серьёзная уголовная тема. Немедленно проконсультируйтесь с адвокатом. Вы имеете право хранить молчание до прихода адвоката.",
      en: "This involves serious criminal matters. Consult a lawyer immediately. You have the right to remain silent until your lawyer arrives.",
    },
  };
}

module.exports = {
  checkUserMessage,
  checkAIResponse,
  SAFETY_RESULT,
};