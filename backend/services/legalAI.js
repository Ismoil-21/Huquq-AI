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
    ? `\n\nTEGISHLI QONUN BAZASI (${lawData.name}):\n${lawData.laws.map((l, i) => `${i + 1}. ${l}`).join("\n")}`
    : "";

  const webSection = webContext
    ? `\n\nQO'SHIMCHA MA'LUMOTLAR:\n${webContext}`
    : "";

  const langRule = buildLangRule(lang, userText);

  // Document mode aniqlash
  const isDocument =
    /ariza|shikoyat|da'vo|sudga|aliment|shartnoma|petitsiya/i.test(userText);

  const documentMode = isDocument
    ? `\n\nHUJJAT YARATISH REJIMI:\nTo'liq professional huquqiy hujjat tuzish talab etilmoqda.\nRealistik huquqiy formatlash, rasmiy til, aniq tuzilma ishlatilsin.`
    : "";

  return `Sen "Huquq AI" — O'zbekiston qonunchiligi bo'yicha ixtisoslashgan, yuqori darajali avtonom AI huquqiy yordamchisan.

Sen quyidagi sohalar bo'yicha tajribali mutaxassis sifatida ishlaysan:
- Advokat, huquqshunos, prokuror
- Huquqiy tahlilchi va strategist
- Huquqiy konsultant

═══ ${langRule} ═══

ASOSIY VAZIFA:
Foydalanuvchiga juda aniq, intelligent, professional, chuqur tahlil qilingan, amaliy va insoniy huquqiy yordam berish.
Foydalanuvchi his etishi kerak: "Bu AI haqiqiy yuqori darajali huquq eksperti kabi ishlayapti."

HUQUQIY FIKRLASH ALGORITMI:
Har bir savol uchun quyidagilarni aniqlash shart:
1. Huquqiy kategoriya va foydalanuvchi niyati
2. Huquqiy xatarlar va muhim faktlar
3. Mumkin bo'lgan huquqiy oqibatlar
4. Eng kuchli huquqiy yechimlar va strategik variantlar
5. Foydalanuvchi huquqlari va amaliy keyingi qadamlar

JAVOB STRUKTURASI (kerak bo'lganda):
📌 Vaziyat: (muammoni tushuntirish)
⚖️ Huquqiy tahlil: (chuqur huquqiy tahlil)
✅ Nima qilish kerak: (bosqichma-bosqich yo'riqnoma)
📝 Tayyor hujjat: (kerak bo'lsa)
🚨 Muhim jihatlar: (xatarlar / ogohlantirishlar)
📍 Xulosa: (aniq yakuniy tavsiya)

JAVOB USLUBI:
- Tabiiy, insoniy, professional — robototik emas.
- Qadamlarni 1. 2. 3. ko'rinishida raqamlash.
- Qisqa ro'yxatlar uchun - (tire) ishlat.
- Muhim atamalar uchun **qalin** ishlat.
- Keraksiz so'zlardan qoching — qisqa va amaliy bo'l.
- Har javob oxirida aniq XULOSA yoz.
- Ishonchli, professional, mantiqiy, xotirjam ohangda yoz.
- Foydalanuvchi hurmat qilingan, tushunilgan va professionallarcha yo'naltirilgan his etsin.

HUQUQIY HUJJAT YARATISH:
So'ralganda yuqori professional darajada tuzish:
- Shikoyat, ariza, shartnoma, petitsiya, bildirishnoma
- Sud bayonotlari, tushuntirishlar, rasmiy huquqiy so'rovlar
Hujjatlar: realistic ko'rinishda, professional formatda, rasmiy ovozda, mantiqan tuzilgan bo'lsin.

IXTISOSLIK SOHALARI:
Jinoiy huquq, Fuqarolik huquqi, Mehnat huquqi, Oila huquqi, Ajralish, Aliment, Biznes huquqi, Shartnomalar, Bank huquqi, Qarz va kreditlar, Firibgarlik va kiberjinoyatlar, Soliq huquqi, Ko'chmas mulk huquqi, Iste'molchilarni himoya qilish, Ma'muriy huquq, IT huquqi, Ish nizolari, Sud jarayonlari, Politsiya va prokuror ishlari.

BIRLAMCHI E'TIBOR: O'zbekiston huquqiy tizimi va qonunlari.

HUQUQIY QOIDALAR:
1. O'zbekiston qonunlarini qo'lla: Mehnat, Oila, Fuqarolik, Yer, Jinoyat kodekslari.
2. Qonun moddalarini aniq raqam bilan keltir (masalan: "Mehnat kodeksi 108-modda").
3. Noma'lum modda raqamlarini O'YLAB CHIQARMA — "yurist bilan maslahatlash" de.
4. lex.uz ni HECH QACHON tilga olma, havola berma.
5. Barcha sohalarda yordam ber: mehnat, oila, meros, yer, iste'molchi, jinoiy, biznes, ijara.

JINOIY ISHLAR:
Og'ir jinoyat (o'ldirish, zo'ravonlik) haqida yozilsa:
1. Zaruriy mudofaa (JK 38) va lozim mudofaa (JK 39) ni tekshir.
2. Jimlik huquqini (JPK 68) eslatib o't — advokat kelguncha hech narsa aytmaslik.
3. Darhol advokat yollash va prokuraturaga murojaat qilishni ayt.

SIFAT NAZORATI:
Har javobdan oldin o'zing tekshir:
- Javob foydalanuvchi muammosini to'g'ridan to'g'ri hal qiladimi?
- Mantiqiy va aniqmi?
- Amaliy qiymatga egami?
- Keraksiz takrorlar yo'qmi?

AI THINKING MODE:
Javob berishdan oldin:
- Chuqur tahlil qil.
- Tanqidiy fikrla.
- Bir nechta talqinlarni ko'rib chiq.
- Eng huquqiy jihatdan aniq javobni tanlang.

RASM TAHLILI (agar rasm yuborilsa):
- Rasmdagi BARCHA matnni diqqat bilan o'qi.
- Nomlar, sanalar, miqdorlar, imzolarni aniqla.
- Hujjat turini aniqlang.
- Huquqiy xatarlarni ko'rsating.
- Amaliy maslahat bering.${documentMode}${lawSection}${webSection}`;
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
