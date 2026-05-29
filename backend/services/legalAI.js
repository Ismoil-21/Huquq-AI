"use strict";
const Groq = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { searchWeb, formatSearchContext } = require("./webSearch");

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ─────────────────────────────────────────────────────────────
// QONUN BAZASI
// ─────────────────────────────────────────────────────────────
const LAW_DATABASE = {
  mehnat: {
    name: "O'zbekiston Mehnat kodeksi (2023)",
    laws: [
      "MK 6-modda: Mehnat munosabatlari qonunchilik bilan tartibga solinadi — shartnoma yoki kelishuv qonunni past darajaga tushirib qo'yolmaydi.",
      "MK 87-modda: Mehnat shartnomasini tugatish asoslari — tomonlar kelishuvi, muddat tugashi, xodim tashabbusi (2 hafta ogohlantirish), ish beruvchi tashabbusi (asosli sabab bilan).",
      "MK 100-modda: Ish haqi oyiga kamida 2 marta belgilangan sanada to'lanishi shart; kechiktirilsa — foizlar to'lanadi.",
      "MK 102-modda: Minimal ish haqi (bazaviy hisoblash miqdori) davlat tomonidan belgilanadi — undan past to'lash taqiqlanadi.",
      "MK 108-modda: Qonunsiz ishdan bo'shatilganda sudga murojaat qilish huquqi — qayta tiklash va o'rtacha ish haqi to'lanadi.",
      "MK 118-modda: Asosiy yillik ta'til — kamida 15 ish kuni, xavfli kasblarda 21-36 kun.",
      "MK 134-modda: Homilador ayollar va 3 yoshgacha bolali onalarni ishdan bo'shatish taqiqlanadi.",
      "MK 148-modda: Kamsitish taqiqlanadi — jinsi, irqi, millati, dini sababli.",
      "MK 210-modda: Mehnat nizolarini hal qilish — mehnat nizolari komissiyasi yoki sud orqali.",
    ],
  },
  oila: {
    name: "O'zbekiston Oila kodeksi (2023)",
    laws: [
      "OK 14-modda: Nikoh ZAGS organlarida rasmiylashtirilib, davlat ro'yxatidan o'tkaziladi — nikoh yoshi 18 (erkak 16, ayol 17 — maxsus holatda).",
      "OK 39-modda: Ajralish tartibi — bolasiz va ixtilof bo'lmasa ZAGS orqali, boshqa hollarda sud.",
      "OK 59-modda: Agar xotin homilador bo'lsa yoki 1 yoshgacha bola bo'lsa — er ajralish arizasi bera olmaydi.",
      "OK 73-modda: Ota-ona voyaga yetmagan bolani boqishga majbur — aliment to'lash tartibi.",
      "OK 74-modda: Aliment miqdori: 1 bola uchun — oylik daromadning 1/4 qismi; 2 bola — 1/3; 3 va undan ko'p — 1/2.",
      "OK 61-modda: Nikohsiz tug'ilgan bolaning otasini aniqlash — ZAGS yoki sud orqali.",
      "OK 80-modda: Ota-ona o'z majburiyatlarini bajarmaganida — voyaga yetmaganlar uchun nafaqa.",
    ],
  },
  meros: {
    name: "Fuqarolik kodeksi — Meros bo'limi (2023)",
    laws: [
      "FK 1113-modda: Birinchi navbatdagi merosxo'rlar — farzandlar, turmush o'rtog'i, ota-ona; ular bo'lmasa ikkinchi navbat — aka-uka, opa-singillar, bobolar.",
      "FK 1119-modda: Vasiyatnoma notarial tasdiqlanadi; og'zaki vasiyat faqat hayot xavfi bo'lganida.",
      "FK 1154-modda: Merosni qabul qilish muddati — vafot etgan kundan 6 oy; muddatni suddan uzaytirish mumkin.",
      "FK 1143-modda: Majburiy ulush — vasiyatnoma bo'lsa ham marhum qaramaqdagi shaxslarga qonuniy ulushning 1/2 dan kam bo'lmasligi kerak.",
      "FK 1162-modda: Meros vasiyat yoki qonun asosida o'tadi; ikkalasi bo'lmasa — davlatga o'tadi.",
    ],
  },
  yer: {
    name: "Yer kodeksi (2023)",
    laws: [
      "YK 14-modda: O'zbekistonda yer davlat mulki — fuqarolarga foydalanishga, ijaraga beriladi.",
      "YK 29-modda: Yer uchastkalari hokimiyat (tuman/shahar) qarori bilan beriladi.",
      "YK 49-modda: Yer uchastka huquqini davlat kadastr organida ro'yxatdan o'tkazish majburiy.",
      "YK 33-modda: Yer uchastkasini noqonuniy egallash — uchastka qaytariladi va jarima solinadi.",
      "Mulk to'g'risidagi qonun 16-modda: Ko'chmas mulkni (uy, hovli) sotish, sovg'a qilish notarius orqali rasmiylashtiriladi.",
    ],
  },
  istemolchi: {
    name: "Iste'molchilar huquqlari to'g'risidagi qonun (2023)",
    laws: [
      "9-modda: Sifatsiz tovar yoki xizmat uchun 14 kun ichida qaytarish yoki almashtirish huquqi.",
      "19-modda: Kafolat muddati ichida tovar buzilsa — bepul ta'mirlash yoki yangi tovar.",
      "22-modda: Xizmat sifatsiz bo'lsa — qayta bajarish, narx kamaytirish yoki pul qaytarish.",
      "24-modda: Tovar sog'liqqa zarar yetkazsa — zararni to'liq qoplash va sud orqali jarima.",
      "Fuqarolik kodeksi 492-modda: Sotuvchi tovarning barcha kamchiliklarini oldindan xaridorga aytishi shart.",
    ],
  },
  jinoiy: {
    name: "Jinoyat kodeksi va Jinoyat-protsessual kodeksi (2023)",
    laws: [
      "JK 97-modda: Qasddan odam o'ldirish — 10 yildan umrbod qamoq.",
      "JK 98-modda: Zaruriy mudofaa doirasida o'ldirish — jinoiy javobgarlik yo'q.",
      "JK 104-modda: Qasddan og'ir tan jarohati — 3-8 yil qamoq.",
      "JK 166-modda: O'g'irlik — 1-3 yil qamoq yoki jarima; yirik miqdorda 5-10 yil.",
      "JK 168-modda: Firibgarlik (aldash orqali mulk egallash) — 3-5 yil qamoq.",
      "JK 207-modda: Pora olish — 7-15 yil qamoq va mulk musodara qilinishi.",
      "JPK 48-modda: Jabrlanuvchi yoki guvohning shikoyat berish huquqi — prokuratura yoki politsiyaga.",
      "JPK 68-modda: Advokat olib qo'yilgan paytdan boshlab ishtirok etish huquqi.",
      "Zaruriy mudofaa (JK 38): O'zini yoki boshqalarni himoya qilish — javobgarlikdan ozod.",
    ],
  },
  tadbirkorlik: {
    name: "Tadbirkorlik va soliq qonunlari (2023)",
    laws: [
      "Tadbirkorlik to'g'risidagi qonun 5-modda: Tadbirkorlik erkinligi — ruxsatsiz sohalarda erkin ishlash.",
      "Tadbirkorlik to'g'risidagi qonun 19-modda: Davlat tekshiruvlari cheklangan — yiliga 1 marta rejalashtirilgan.",
      "Soliq kodeksi 128-modda: Soliq to'lash majburiyati va muddatlari.",
      "OOO to'g'risidagi qonun 12-modda: Nizomiy kapital va ta'sischilarning javobgarligi.",
      "Bankrotlik to'g'risidagi qonun 4-modda: Bankrotlikni e'lon qilish tartibi — sudga ariza.",
    ],
  },
  uy_joy: {
    name: "Uy-joy kodeksi va Fuqarolik kodeksi — Ijara",
    laws: [
      "Uy-joy kodeksi 6-modda: Fuqarolarning uy-joy huquqi — noqonuniy chiqarib yuborish taqiqlanadi.",
      "FK 545-modda: Uy ijarasi shartnomasi yozma tuziladi; 1 yildan ortiq — notarial tasdiq.",
      "FK 547-modda: Ijara to'lovini o'zboshimchalik bilan oshirish — 2 oydan oldin xabardor qilish shart.",
      "FK 556-modda: Ijarachilarni suddan tashqari chiqarib yuborish taqiqlanadi.",
      "FK 551-modda: Mulkdor uy-joy ta'mirini o'z hisobiga amalga oshiradi.",
    ],
  },
  ma_muriy: {
    name: "Ma'muriy kodeks va davlat xizmatlari (2023)",
    laws: [
      "Ma'muriy kodeks 40-modda: Davlat xodimlari qarorlariga shikoyat — yuqori organ yoki sud.",
      "FK 14-modda: Shaxsning sha'ni va qadr-qimmatiga tajovuz — sudda himoya qilish huquqi.",
      "Ommaviy axborot vositalari to'g'risidagi qonun 32-modda: Noto'g'ri ma'lumotni rad etish huquqi.",
    ],
  },
};

const CATEGORY_MAP = [
  {
    id: "mehnat",
    kw: [
      "ish ",
      "maosh",
      "ishdan",
      "ta'til",
      "xodim",
      "ish haqi",
      "mehnat",
      "bo'shatish",
      "ish beruvchi",
      "ishchi",
      "labor",
      "зарплата",
      "работа",
      "уволить",
    ],
  },
  {
    id: "oila",
    kw: [
      "ajralish",
      "nikoh",
      "aliment",
      "oila",
      "zags",
      "turmush",
      "divorce",
      "marriage",
      "развод",
      "алименты",
      "семья",
    ],
  },
  {
    id: "meros",
    kw: [
      "meros",
      "vasiyat",
      "notarius",
      "vafot",
      "merosxo'r",
      "inheritance",
      "наследство",
      "завещание",
    ],
  },
  {
    id: "yer",
    kw: [
      "yer",
      "kadastr",
      "hovli",
      "uchastka",
      "qishloq",
      "dala",
      "land",
      "земля",
      "участок",
    ],
  },
  {
    id: "istemolchi",
    kw: [
      "tovar",
      "qaytarish",
      "sotuvchi",
      "kafolat",
      "sifatsiz",
      "do'kon",
      "xaridor",
      "consumer",
      "товар",
      "возврат",
    ],
  },
  {
    id: "jinoiy",
    kw: [
      "jinoyat",
      "o'g'irlik",
      "firib",
      "politsiya",
      "pora",
      "o'ldi",
      "urdi",
      "kaltakladi",
      "zo'rlash",
      "tahdid",
      "crime",
      "murder",
      "killed",
      "arrested",
      "преступление",
      "убийство",
      "арест",
    ],
  },
  {
    id: "tadbirkorlik",
    kw: [
      "biznes",
      "tadbirkor",
      "kompaniya",
      "soliq",
      "ooo",
      "ip",
      "business",
      "налог",
      "компания",
    ],
  },
  {
    id: "uy_joy",
    kw: [
      "kvartira",
      "ijara",
      "mulk",
      "ko'chmas",
      "xonadon",
      "ijarakor",
      "apartment",
      "rent",
      "квартира",
      "аренда",
    ],
  },
  {
    id: "ma_muriy",
    kw: [
      "hokimiyat",
      "davlat",
      "korrupsiya",
      "mansabdor",
      "sud",
      "ariza",
      "shikoyat",
      "government",
      "чиновник",
    ],
  },
];

function detectCategory(text = "") {
  const low = text.toLowerCase();
  for (const cat of CATEGORY_MAP) {
    if (cat.kw.some((k) => low.includes(k))) return cat.id;
  }
  return "general";
}

function getLawsForCategory(cat) {
  return LAW_DATABASE[cat] || null;
}

function cleanHistory(history = [], currentMessage = "") {
  const current = currentMessage.toLowerCase();
  const commonWords = current.split(" ").filter((w) => w.length > 4);

  const filtered =
    commonWords.length > 0
      ? history.filter((m) => {
          const txt = String(m.content || "").toLowerCase();
          return commonWords.some((w) => txt.includes(w));
        })
      : history;

  return filtered.slice(-6).map((m) => ({
    role: m.role,
    content: String(m.content || "").slice(0, 700),
  }));
}

// ─────────────────────────────────────────────────────────────
// ANTI-REPEAT FILTER
// ─────────────────────────────────────────────────────────────
function removeRepeated(text = "") {
  const lines = text.split("\n");
  const seen = new Set();
  return lines
    .filter((line) => {
      const clean = line.trim();
      if (!clean) return true; // bo'sh qatorlarni saqlash
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────────
// TIL VA ALIFBO ANIQLASH
// ─────────────────────────────────────────────────────────────
function detectScript(text = "") {
  const cyrillic = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const latin = (text.match(/[a-zA-Z']/g) || []).length;
  return cyrillic > latin ? "cyrillic" : "latin";
}

function buildLangRule(lang, text) {
  if (lang === "ru") {
    return `ЯЗЫК ОТВЕТА — СТРОГОЕ ПРАВИЛО:
Отвечай ТОЛЬКО на русском языке.
НЕ переключайся на узбекский или другой язык.
НЕ меняй язык ни при каких условиях.`;
  }
  if (lang === "en") {
    return `LANGUAGE RULE — STRICT:
Respond ONLY in English.
Do NOT switch to Uzbek or any other language under any circumstances.`;
  }
  // O'zbek — lotin yoki kiril
  const script = detectScript(text);
  if (script === "cyrillic") {
    return `ТИЛ ҚОИДАСИ — ҚАТЪИЙ:
Жавобни фақат ЎЗБЕК тилида ва фақат КИРИЛ алифбосида ёз.
Лотин ёзувига ЎТМА.
Рус тилига ЎТМА.
Ҳеч қандай шароитда бошқа алифбо ёки тилга ўтма.`;
  }
  return `TIL QOIDASI — QAT'IY:
Javobni faqat O'ZBEK tilida va faqat LOTIN alifbosida yoz.
Kirill yozuviga O'TMA.
Rus tiliga O'TMA.
Hech qanday sharoitda boshqa alifbo yoki tilga o'tma.`;
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — HUQUQ AI MASTER PROMPT ga moslashtirilgan
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(
  category,
  lawData,
  webContext,
  lang = "uz",
  userText = "",
) {
  const lawSection = lawData
    ? `\n\nVERIFIED LAW REFERENCES (${lawData.name}):\n${lawData.laws.map((l, i) => `${i + 1}. ${l}`).join("\n")}\n(Only cite these references — do not add or invent additional article numbers.)`
    : "";

  const webSection = webContext ? `\n\nADDITIONAL CONTEXT:\n${webContext}` : "";

  const langRule = buildLangRule(lang, userText);

  // Document mode aniqlash
  const isDocument =
    /ariza|shikoyat|da'vo|sudga|aliment|shartnoma|petitsiya/i.test(userText);

  const documentMode = isDocument
    ? `\n\nDOCUMENT MODE ACTIVE:\nGenerate a full, professional legal document.\nUse realistic legal formatting, official tone, and clear structure.`
    : "";

  return `You are a production-grade Legal AI assistant for Uzbekistan law.
Your primary goal is to provide accurate, practical, and safe legal guidance.

════════════════════════════════════
STRICT RULES (NON-NEGOTIABLE)
════════════════════════════════════
1. NEVER invent laws, legal codes, or article numbers.
   If uncertain about a specific article → say: "I am not certain about the exact article."
2. Do NOT hallucinate or fabricate legal references.
   Only cite laws from the VERIFIED LAW REFERENCES section below (if provided).
3. Do NOT repeat sentences, phrases, or sections.
4. Do NOT roleplay as a judge, prosecutor, or lawyer.
   You are an assistant — not a courtroom persona.
5. If the user requests illegal, violent, or harmful actions:
   - Refuse briefly and redirect to a legal explanation.
6. Keep responses structured but concise.
   Do not over-explain. Do not generate long unnecessary lists.

════════════════════════════════════
REASONING STYLE (INTERNAL ONLY)
════════════════════════════════════
For every legal question, internally analyze:
1. What is the legal issue?
2. Which law category applies?
3. What are the possible legal consequences?
4. What are the safest practical steps for the user?
Output ONLY the final answer — never show internal reasoning steps.

════════════════════════════════════
RESPONSE FORMAT (USE ONLY WHEN RELEVANT)
════════════════════════════════════
📌 Vaziyat / Situation:
(Brief summary of user issue)

⚖️ Huquqiy tahlil / Legal analysis:
(Accurate, non-fabricated legal explanation)

✅ Nima qilish kerak / What to do:
(Clear, actionable steps in order)

📝 Hujjat / Document:
(Only if document was requested)

📍 Xulosa / Conclusion:
(Short final recommendation)

If the question is simple → respond in plain paragraph form (no structure needed).

════════════════════════════════════
QUALITY CONTROL BEFORE ANSWERING
════════════════════════════════════
- Is any law or article number uncertain? → DO NOT INVENT IT
- Is there repetition? → REMOVE IT
- Is the answer practical and actionable? → MUST be
- Is the tone natural and human? → NOT robotic
- Is the response too long? → SHORTEN IT

════════════════════════════════════
DOCUMENT GENERATION
════════════════════════════════════
When a document is requested (ariza, shikoyat, shartnoma, da'vo, petition):
- Generate a complete, professional legal document
- Use realistic legal formatting and official tone
- Structure it logically with proper sections

════════════════════════════════════
IMAGE ANALYSIS (if image is provided)
════════════════════════════════════
- Extract ALL text from the image carefully
- Identify: names, dates, amounts, signatures, document type
- Assess legal risks
- Provide practical advice based on content

════════════════════════════════════
${langRule}
════════════════════════════════════${documentMode}${lawSection}${webSection}`;
}

// ─────────────────────────────────────────────────────────────
// AI CALL FUNCTIONS
// ─────────────────────────────────────────────────────────────
async function callGroq(messages, userMessage = "") {
  if (!groqClient) throw new Error("GROQ_API_KEY sozlanmagan");

  // Model routing: murakkab savollarda kuchli model ishlatiladi
  const isComplex =
    (userMessage && userMessage.length > 500) ||
    /sud|jinoyat|o'ldirish|firib|qamoq|huquq|shartnoma|meros|aliment/i.test(
      userMessage || "",
    );

  const model =
    process.env.GROQ_MODEL ||
    (isComplex ? "llama-3.3-70b-versatile" : "llama-3.1-8b-instant");

  const resp = await groqClient.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 2000,
  });
  const raw = resp.choices?.[0]?.message?.content?.trim() || "";
  return removeRepeated(raw);
}

async function callGemini(
  systemPrompt,
  userMessage,
  history,
  imageBase64 = null,
  imageMimeType = "image/jpeg",
) {
  if (!geminiClient) throw new Error("GEMINI_API_KEY sozlanmagan");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const historyMsgs = cleanHistory(history).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 800) }],
  }));

  const currentParts = [];
  if (imageBase64) {
    currentParts.push({
      text: `${userMessage}\n\nRASMDAGI MA'LUMOTLARNI BATAFSIL TAHLIL QILING:\n- Barcha matnni o'qing\n- Hujjat turini aniqlang\n- Sanalar, miqdorlar, shartlarni ko'rsating\n- Huquqiy baholang\n- Amaliy maslahat bering`,
    });
    currentParts.push({
      inlineData: { mimeType: imageMimeType, data: imageBase64 },
    });
  } else {
    currentParts.push({ text: userMessage });
  }

  const contents = [...historyMsgs, { role: "user", parts: currentParts }];

  const resp = await geminiClient.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: imageBase64 ? 3000 : 2000,
    },
  });

  try {
    if (typeof resp.text === "function") return resp.text().trim();
    if (typeof resp.text === "string") return resp.text.trim();
  } catch {}

  const text =
    resp.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
    "";
  return text.trim();
}

async function generateAnswer(
  systemPrompt,
  userMessage,
  history,
  imageBase64 = null,
  imageMimeType = "image/jpeg",
) {
  if (imageBase64) {
    try {
      const result = await callGemini(
        systemPrompt,
        userMessage,
        history,
        imageBase64,
        imageMimeType,
      );
      if (result && result.length > 20) return result;
      throw new Error("Gemini bo'sh javob qaytardi");
    } catch (err) {
      console.error("Gemini vision error:", err.message);
      try {
        const fallbackMsg = `Foydalanuvchi rasm yubordi va quyidagi savol berdi: "${userMessage}". Huquqiy maslahat bering.`;
        const msgs = [
          { role: "system", content: systemPrompt },
          ...cleanHistory(history, userMessage),
          { role: "user", content: fallbackMsg },
        ];
        const groqResult = await callGroq(msgs);
        if (groqResult) return groqResult;
      } catch (e) {
        console.error("Groq fallback error:", e.message);
      }
      throw new Error(
        "Rasmni tahlil qilishda xatolik. Gemini API kalitini tekshiring.",
      );
    }
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...cleanHistory(history, userMessage),
    { role: "user", content: String(userMessage).slice(0, 2000) },
  ];

  try {
    return await callGroq(messages, userMessage);
  } catch (groqErr) {
    console.error("Groq error:", groqErr.message);
    try {
      const text = await callGemini(systemPrompt, userMessage, history);
      if (text) return text;
    } catch (gemErr) {
      console.error("Gemini fallback error:", gemErr.message);
    }
    throw groqErr;
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────
async function getLegalAdvice(
  userMessage,
  history = [],
  imageBase64 = null,
  imageMimeType = "image/jpeg",
  lang = "uz",
) {
  const category = detectCategory(userMessage);
  const lawData = getLawsForCategory(category);

  let webResults = [];
  try {
    webResults = await searchWeb(userMessage, 5);
  } catch (err) {
    console.warn("Web search skipped:", err.message);
  }

  // lex.uz filterlaymiz
  const filteredResults = webResults.filter((r) => {
    const src = (r.source || "").toLowerCase();
    const url = (r.url || "").toLowerCase();
    return src !== "lex.uz" && !url.includes("lex.uz");
  });

  const webContext = formatSearchContext(filteredResults);
  const systemPrompt = buildSystemPrompt(
    category,
    lawData,
    webContext,
    lang,
    userMessage,
  );

  // Rasm tahlili uchun til bo'yicha ko'rsatma
  const imageInstructions = {
    uz: "\n\nRASM TAHLILI:\nRasmdagi barcha matnni o'qi, hujjat turini aniqla, huquqiy baho ber, amaliy maslahat ber.",
    "uz-cyrillic":
      "\n\nРАСМ ТАҲЛИЛИ:\nРасмдаги барча матнни ўқи, ҳужжат турини аниқла, ҳуқуқий баҳо бер, амалий маслаҳат бер.",
    ru: "\n\nАНАЛИЗ ИЗОБРАЖЕНИЯ:\nПрочитай весь текст, определи тип документа, дай правовую оценку, предложи конкретный совет.",
    en: "\n\nIMAGE ANALYSIS:\nRead all text, identify document type, give legal assessment, provide practical advice.",
  };

  let imgKey = lang;
  if (lang === "uz" && detectScript(userMessage) === "cyrillic")
    imgKey = "uz-cyrillic";

  const finalPrompt = imageBase64
    ? systemPrompt + (imageInstructions[imgKey] || imageInstructions.uz)
    : systemPrompt;

  try {
    const answer = await generateAnswer(
      finalPrompt,
      userMessage,
      history,
      imageBase64,
      imageMimeType,
    );

    if (!answer) {
      return {
        answer:
          "Kechirasiz, javob shakllantirilmadi. Savolingizni boshqacha ifodalab qayta yuboring.",
        category,
      };
    }

    // Professional output cleaner — markdown formatini tozalash
    const cleanedAnswer = answer
      .replace(/\*\*/g, "")
      .replace(/#{1,6} /g, "")
      .trim();

    return { answer: cleanedAnswer, category };
  } catch (err) {
    console.error("AI error:", err.message);

    if (err.status === 429) {
      return {
        answer:
          "AI serveri hozir band. Bir necha daqiqadan so'ng qayta urinib ko'ring.",
        category: "system",
      };
    }
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return {
        answer:
          "AI sozlanmagan. Administrator API kalitlarini .env faylga qo'shishi kerak.",
        category: "system",
      };
    }
    return {
      answer:
        "AI vaqtincha ishlamayapti. Keyinroq qayta urinib ko'ring yoki Telegram botga murojaat qiling.",
      category: "system",
    };
  }
}

module.exports = { getLegalAdvice, detectCategory };
