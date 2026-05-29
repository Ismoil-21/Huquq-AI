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
// QONUN BAZASI (kengaytirilgan)
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
      "xodim",
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
      "bola",
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
      "shikoyat",
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
      "uy",
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

function cleanHistory(history = []) {
  return history.slice(-8).map((m) => ({
    role: m.role,
    content: String(m.content || "").slice(0, 500),
  }));
}

// ─────────────────────────────────────────────────────────────
// PROFESSIONAL SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(category, lawData, webContext, lang = "uz") {
  const lawSection = lawData
    ? `\n\nTEGISHLI QONUN BAZASI (${lawData.name}):\n${lawData.laws.map((l, i) => `${i + 1}. ${l}`).join("\n")}`
    : "";

  const webSection = webContext
    ? `\n\nQO'SHIMCHA MA'LUMOTLAR:\n${webContext}`
    : "";

  const langRules = {
    uz: "Javobni O'ZBEK TILIDA yoz. Oddiy, tushunarli so'zlar ishlat. Murakkab yuridik atamalarni oddiy tilda tushuntir.",
    ru: "Отвечай ТОЛЬКО НА РУССКОМ ЯЗЫКЕ. Используй простые, понятные слова. Юридические термины объясняй простым языком.",
    en: "Respond ONLY IN ENGLISH. Use simple, clear language. Explain legal terms in plain language.",
  };
  const langInstruction = langRules[lang] || langRules.uz;

  return `You are an advanced professional AI assistant specialized in legal consultation for Uzbekistan. You have deep reasoning, multilingual communication, and structured problem-solving abilities.

PRIMARY GOAL: Provide accurate, intelligent, helpful, professional, and context-aware legal responses.

TIL QOIDASI (ENG MUHIM):
${langInstruction}

CORE BEHAVIOR:
1. Deeply analyze the user's message before answering.
2. Never repeat previous answers unless explicitly asked.
3. Focus on solving the user's REAL legal problem.
4. Think step-by-step before generating the final response.
5. Avoid hallucinations and fake legal information.
6. If uncertain — clearly say "yurist bilan maslahatlashish tavsiya etiladi".
7. Every answer must be freshly generated for the current request.

RESPONSE FORMAT:
- Write in a clear, natural, human-like tone — not robotic.
- Use simple numbered lists (1. 2. 3.) when explaining steps.
- Use bullet points (- item) for short lists.
- Use bold (**text**) only for important terms or section headers.
- Keep responses concise and practical — no filler text.
- End each response with a short 1-2 sentence SUMMARY/CONCLUSION.
- Do NOT use special symbols like ═══ ▸ ◆ ━━━ in responses.

LEGAL EXPERTISE:
- Apply Uzbekistan law: Mehnat kodeksi, Oila kodeksi, Fuqarolik kodeksi, Yer kodeksi, Jinoyat kodeksi.
- Always cite real law articles with exact numbers (e.g. "Mehnat kodeksi 108-modda").
- NEVER invent or guess law article numbers — if unsure, recommend consulting a lawyer.
- Do NOT mention or link lex.uz.
- Cover: employment, family, inheritance, land, consumer rights, criminal, business, rental, fraud, IT law.

PROFESSIONAL MODE:
Act like a senior legal consultant — confident, professional, calm, logical.

CRIMINAL CASES:
If user mentions a serious crime:
1. Check zaruriy mudofaa (JK 38) and lozim mudofaa (JK 39).
2. Remind of jimlik huquqi (JPK 68) — say nothing until lawyer arrives.
3. Advise immediately hiring a lawyer and contacting prokuratura.${lawSection}${webSection}`;
}

// ─────────────────────────────────────────────────────────────
// AI CALL FUNCTIONS
// ─────────────────────────────────────────────────────────────
async function callGroq(messages) {
  if (!groqClient) throw new Error("GROQ_API_KEY sozlanmagan");
  const resp = await groqClient.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages,
    temperature: 0.15,
    max_tokens: 1500,
  });
  return resp.choices?.[0]?.message?.content?.trim() || "";
}

// BUG FIX #1: Gemini @google/genai v2.x API to'g'ri sintaksis
async function callGemini(
  systemPrompt,
  userMessage,
  history,
  imageBase64 = null,
  imageMimeType = "image/jpeg",
) {
  if (!geminiClient) throw new Error("GEMINI_API_KEY sozlanmagan");

  const historyText = cleanHistory(history)
    .map(
      (m) => `${m.role === "user" ? "Foydalanuvchi" : "Advokat"}: ${m.content}`,
    )
    .join("\n");

  const textPrompt = historyText
    ? `${systemPrompt}\n\n═══ OLDINGI SUHBAT ═══\n${historyText}\n\n═══ YANGI SAVOL ═══\n${userMessage}`
    : `${systemPrompt}\n\n${userMessage}`;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  let contents;
  if (imageBase64) {
    // BUG FIX: @google/genai v2.x da to'g'ri multimodal format
    contents = [
      {
        role: "user",
        parts: [
          { text: textPrompt },
          {
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ];
  } else {
    contents = [
      {
        role: "user",
        parts: [{ text: textPrompt }],
      },
    ];
  }

  // BUG FIX: @google/genai v2.x da to'g'ri API chaqiruvi
  const resp = await geminiClient.models.generateContent({
    model,
    contents,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 1500,
    },
  });

  // BUG FIX: response.text() method yoki candidates orqali olish
  if (resp.text) return resp.text.trim();

  // fallback: candidates array dan olish
  const candidate = resp.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || "";
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
    // Rasm bor — avval Gemini, keyin Groq (Groq rasm ko'rmaydi)
    try {
      const result = await callGemini(
        systemPrompt,
        userMessage,
        history,
        imageBase64,
        imageMimeType,
      );
      if (result) return result;
      throw new Error("Gemini bo'sh javob qaytardi");
    } catch (err) {
      console.error("Gemini vision error:", err.message);
      throw new Error(
        "Rasmni tahlil qilishda xatolik yuz berdi. Gemini API kalitini tekshiring.",
      );
    }
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...cleanHistory(history),
    { role: "user", content: String(userMessage).slice(0, 2000) },
  ];

  try {
    return await callGroq(messages);
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

  // BUG FIX #4: webContext dan lex.uz ma'lumotlarini olib tashlash
  const filteredResults = webResults.filter((r) => {
    const src = (r.source || "").toLowerCase();
    const url = (r.url || "").toLowerCase();
    return src !== "lex.uz" && !url.includes("lex.uz");
  });

  const webContext = formatSearchContext(filteredResults);
  const systemPrompt = buildSystemPrompt(category, lawData, webContext, lang);

  const finalPrompt = imageBase64
    ? systemPrompt +
      "\n\n10. Foydalanuvchi RASM yubordi — rasmni diqqat bilan tahlil qilib, unda ko'rinadigan hujjat, shartnoma, qaror yoki boshqa huquqiy ma'lumotga asosan maslahat bering."
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

    return { answer, category };
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